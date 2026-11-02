/**
 * VerityNow.AI Backend - Distinct Accounts & Dual-Sync
 * v4.1 - Robust File Storage & Privacy
 */

const CONFIG = {
  ROOT_FOLDER_NAME: "VerityNow_AI_Master",
  MASTER_DB_NAME: "Master_User_DB",
  LOCK_WAIT_MS: 30000,
  MIME_JSON: ContentService.MimeType.JSON
};

const MASTER_SHEETS = {
  USERS: 'Users',
  PENDING_LINKS: 'PendingLinks'
};

const USER_SHEETS = {
  PROFILE: 'Profile',
  REPORTS: 'Reports',
  DOCUMENTS: 'Documents', 
  SHARED_EVENTS: 'SharedEvents',
  MESSAGES: 'Messages',
  TEMPLATES: 'Templates'
};

const MSG_HEADER = ['id', 'sender_id', 'recipient_id', 'content', 'timestamp', 'read_status', 'thread_id', 'subject'];

// Column Mappings (0-based)
const COLS = {
  USERS: { ID: 0, USERNAME: 1, PASS: 2, LINK_ID: 3, FOLDER: 4, SS_ID: 5 }
};

// --- HTTP HANDLERS ---
function doGet(e) { return router(e); }
function doPost(e) { return router(e); }

function router(e) {
  if (!e) return response({ status: 'error', message: 'No request data' });
  let lock = LockService.getScriptLock();
  let params = e.parameter || {};
  
  if (e.postData && e.postData.contents) {
    try {
      params = { ...params, ...JSON.parse(e.postData.contents) };
    } catch (err) {
      return response({ status: 'error', message: 'Invalid JSON body' });
    }
  }

  const action = params.action;
  
  try {
    // Actions that modify data require a lock to prevent race conditions
    const writeActions = ['signup', 'linkByUsername', 'saveItems', 'sendMessage', 'saveSharedEvent', 'saveSharedEventsBatch'];
    if (writeActions.includes(action)) {
      if (!lock.tryLock(CONFIG.LOCK_WAIT_MS)) return response({ status: 'error', message: 'Server busy. Please try again.' });
    }

    let result = {};
    switch (action) {
      // Auth & Setup
      case 'setup': result = setup(); break;
      case 'signup': result = registerUser(params.username, params.password, params.email); break;
      case 'login': result = loginUser(params.username, params.password); break;
      
      // Core Data
      case 'sync': result = syncData(params.userId); break;
      
      // Private Data (Single User Write)
      case 'saveItems': result = saveItems(params.userId, params.type, params.items); break;
      case 'getDocumentContent': result = getDocumentContent(params.userId, params.docId); break;
      
      // Linking
      case 'linkByUsername': result = linkAccountsByUsername(params.userId, params.targetUsername); break;
      
      // Shared Data (Dual User Write)
      case 'sendMessage': result = sendMessage(params.userId, params.content, params.threadId, params.subject); break;
      case 'getMessages': result = getMessages(params.userId, params.after); break;
      case 'saveSharedEventsBatch': result = saveSharedEventsBatch(params.userId, params.events); break;
      case 'getSharedEvents': result = getSharedEvents(params.userId); break;
      
      default: throw new Error('Unknown action: ' + action);
    }
    return response(result);
  } catch (err) {
    return response({ status: 'error', message: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

function response(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(CONFIG.MIME_JSON);
}

// --- CORE HELPERS ---

function getMasterSS() {
  const props = PropertiesService.getScriptProperties();
  const cachedId = props.getProperty('MASTER_SS_ID');
  if (cachedId) {
    try { return SpreadsheetApp.openById(cachedId); } catch(e) {}
  }
  const folders = DriveApp.getFoldersByName(CONFIG.ROOT_FOLDER_NAME);
  if (!folders.hasNext()) throw new Error("System not initialized. Run setup()");
  const ss = SpreadsheetApp.open(folders.next().getFilesByName(CONFIG.MASTER_DB_NAME).next());
  props.setProperty('MASTER_SS_ID', ss.getId());
  return ss;
}

function getUserContext(userId) {
  const ss = getMasterSS();
  const data = ss.getSheetByName(MASTER_SHEETS.USERS).getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][COLS.USERS.ID]) === String(userId)) {
      return {
        rowIdx: i + 1,
        userId: data[i][COLS.USERS.ID],
        username: data[i][COLS.USERS.USERNAME],
        linkedUserId: data[i][COLS.USERS.LINK_ID],
        folderId: data[i][COLS.USERS.FOLDER],
        spreadsheetId: data[i][COLS.USERS.SS_ID]
      };
    }
  }
  throw new Error("User not found: " + userId);
}

function getUserContextByUsername(username) {
  const ss = getMasterSS();
  const data = ss.getSheetByName(MASTER_SHEETS.USERS).getDataRange().getValues();
  const search = String(username).toLowerCase().trim();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][COLS.USERS.USERNAME]).toLowerCase().trim() === search) {
      return {
        rowIdx: i + 1,
        userId: data[i][COLS.USERS.ID],
        username: data[i][COLS.USERS.USERNAME],
        password: data[i][COLS.USERS.PASS],
        linkedUserId: data[i][COLS.USERS.LINK_ID],
        folderId: data[i][COLS.USERS.FOLDER],
        spreadsheetId: data[i][COLS.USERS.SS_ID]
      };
    }
  }
  return null;
}

// --- SETUP & AUTH ---

function setup() {
  const props = PropertiesService.getScriptProperties();
  const folders = DriveApp.getFoldersByName(CONFIG.ROOT_FOLDER_NAME);
  const root = folders.hasNext() ? folders.next() : DriveApp.createFolder(CONFIG.ROOT_FOLDER_NAME);
  props.setProperty('ROOT_FOLDER_ID', root.getId());
  
  let masterSS;
  const files = root.getFilesByName(CONFIG.MASTER_DB_NAME);
  if (files.hasNext()) masterSS = SpreadsheetApp.open(files.next());
  else {
    masterSS = SpreadsheetApp.create(CONFIG.MASTER_DB_NAME);
    DriveApp.getFileById(masterSS.getId()).moveTo(root);
  }
  props.setProperty('MASTER_SS_ID', masterSS.getId());

  const ensure = (name, h) => {
    if (!masterSS.getSheetByName(name)) masterSS.insertSheet(name).appendRow(h);
  };
  ensure(MASTER_SHEETS.USERS, ['user_id', 'username', 'password', 'linked_user_id', 'data_folder_id', 'data_spreadsheet_id', 'created_at', 'email']);
  ensure(MASTER_SHEETS.PENDING_LINKS, ['requester_id', 'target_username', 'created_at']);
  
  return { status: 'success' };
}

function registerUser(username, password, email) {
  const clean = String(username).trim();
  const cleanEmail = String(email || '').trim();
  if (getUserContextByUsername(clean)) throw new Error("Username already taken");

  const userId = Utilities.getUuid();
  const props = PropertiesService.getScriptProperties();
  const rootId = props.getProperty('ROOT_FOLDER_ID');
  const rootFolder = DriveApp.getFolderById(rootId);

  // 1. Create PRIVATE folder and spreadsheet for this user
  const folder = rootFolder.createFolder("VerityNow_User_" + clean);
  const ss = SpreadsheetApp.create("VerityNow_Data_" + clean);
  DriveApp.getFileById(ss.getId()).moveTo(folder);
  
  // 2. Initialize Sheets
  const h = {
    [USER_SHEETS.PROFILE]: ['user_id', 'data', 'updated_at'],
    [USER_SHEETS.REPORTS]: ['id', 'user_id', 'data', 'incident_date', 'updated_at', 'is_deleted'],
    [USER_SHEETS.DOCUMENTS]: ['id', 'user_id', 'meta', 'drive_file_id', 'updated_at', 'is_deleted'],
    [USER_SHEETS.SHARED_EVENTS]: ['id', 'creator_id', 'participants', 'data', 'start_time', 'updated_at'],
    [USER_SHEETS.MESSAGES]: MSG_HEADER,
    [USER_SHEETS.TEMPLATES]: ['id', 'user_id', 'data', 'updated_at', 'is_deleted']
  };
  Object.keys(h).forEach(k => {
    const s = ss.insertSheet(k);
    s.appendRow(h[k]);
  });
  const def = ss.getSheetByName('Sheet1');
  if (def) ss.deleteSheet(def);

  // 3. Register in Master DB
  const masterSS = getMasterSS();
  masterSS.getSheetByName(MASTER_SHEETS.USERS).appendRow([
    userId, 
    clean, 
    password, 
    "", // No linked user initially
    folder.getId(), 
    ss.getId(), 
    new Date(),
    cleanEmail
  ]);
  
  // Send Welcome Email
  if (cleanEmail) {
    try {
      const subject = "Welcome to Shouting Parents - Your Secure Co-Parenting Platform";
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e3a8a;">Welcome to Shouting Parents</h2>
          <p>Hello <strong>${clean}</strong>,</p>
          <p>Thank you for creating an account with Shouting Parents. We are dedicated to providing you with a secure, AI-powered platform to manage your co-parenting journey.</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1f2937;">Your Login Information</h3>
            <p style="margin: 5px 0;"><strong>Username:</strong> ${clean}</p>
            <p style="margin: 5px 0;"><strong>Password:</strong> ${password}</p>
          </div>
          <p><strong>Getting Started:</strong></p>
          <ul>
            <li><strong>Complete your profile:</strong> Add your children's details and link your account with your co-parent if applicable.</li>
            <li><strong>Log incidents:</strong> Keep a secure, timestamped record of events.</li>
            <li><strong>Use the AI Assistant:</strong> Get biblical and legal insights on your situation.</li>
          </ul>
          <p>For your security, please keep this information safe. We recommend not sharing your password with anyone.</p>
          <p>Best regards,<br/>The Shouting Parents Team</p>
        </div>
      `;
      MailApp.sendEmail({
        to: cleanEmail,
        subject: subject,
        htmlBody: htmlBody
      });
    } catch (e) {
      // Ignore email errors to not fail registration
    }
  }

  // 4. Check for Pending Invites (Automatic Linking)
  try { processPendingInvites(masterSS, userId, clean); } catch(e) {}

  return { status: 'success', userId: userId, username: clean };
}

function processPendingInvites(masterSS, userId, username) {
  const pSheet = masterSS.getSheetByName(MASTER_SHEETS.PENDING_LINKS);
  const pData = pSheet.getDataRange().getValues();
  const cleanName = String(username).toLowerCase();
  
  let requesterId = null;
  let rowsToDelete = [];

  for(let i=1; i<pData.length; i++) {
    if(String(pData[i][1]).toLowerCase() === cleanName) {
      requesterId = pData[i][0];
      rowsToDelete.push(i+1);
    }
  }

  if (requesterId) {
    // Perform Link
    const uSheet = masterSS.getSheetByName(MASTER_SHEETS.USERS);
    const uData = uSheet.getDataRange().getValues();
    let myRow = -1, reqRow = -1;
    
    for(let i=1; i<uData.length; i++) {
      if(String(uData[i][0]) === String(userId)) myRow = i+1;
      if(String(uData[i][0]) === String(requesterId)) reqRow = i+1;
    }
    
    if(myRow > 0 && reqRow > 0) {
      uSheet.getRange(myRow, 4).setValue(requesterId);
      uSheet.getRange(reqRow, 4).setValue(userId);
    }
    
    // Clean up pending
    for(let i=rowsToDelete.length-1; i>=0; i--) pSheet.deleteRow(rowsToDelete[i]);
  }
}

function loginUser(username, password) {
  const user = getUserContextByUsername(username);
  if (user && String(user.password) === String(password)) {
    return { status: 'success', userId: user.userId, username: user.username, linkedUserId: user.linkedUserId };
  }
  return { status: 'error', message: 'Invalid credentials' };
}

// --- DATA SYNC (Reads from Private Sheet) ---

function syncData(userId) {
  const ctx = getUserContext(userId);
  const userSS = SpreadsheetApp.openById(ctx.spreadsheetId);
  
  // Helper to read JSON from sheets
  const parse = (name, isSingle, isMeta) => {
    const s = userSS.getSheetByName(name);
    if (!s) return isSingle ? null : [];
    const vals = s.getDataRange().getValues();
    if (vals.length < 2) return isSingle ? null : [];
    
    // Auto-detect columns based on name
    // Profile: data is col 1
    // Reports/Templates: data is col 2
    // Documents: meta is col 2
    const dIdx = (name === USER_SHEETS.PROFILE) ? 1 : 2;
    const delIdx = vals[0].indexOf('is_deleted');
    
    const res = [];
    for (let i = 1; i < vals.length; i++) {
      if (delIdx > -1 && vals[i][delIdx] === true) continue;
      try {
        let obj = JSON.parse(vals[i][dIdx]);
        if (isMeta) obj.id = vals[i][0];
        res.push(obj);
      } catch(e) {}
    }
    return isSingle ? (res.length ? res[0] : null) : res;
  };

  return {
    status: 'success',
    data: {
      reports: parse(USER_SHEETS.REPORTS),
      templates: parse(USER_SHEETS.TEMPLATES),
      profile: parse(USER_SHEETS.PROFILE, true),
      documents: parse(USER_SHEETS.DOCUMENTS, false, true),
      // Shared events are stored locally (via dual-write), so just read local
      sharedEvents: getSharedEventsList(userSS), 
      linkedUserId: ctx.linkedUserId
    }
  };
}

// --- LINKING (Updates Pointer Only) ---

function linkAccountsByUsername(userId, targetUsername) {
  const masterSS = getMasterSS();
  const ctx = getUserContext(userId);
  const target = getUserContextByUsername(targetUsername);
  
  if (target) {
    if (target.userId === userId) throw new Error("Cannot link to self");
    
    // Update IDs in Master DB
    const sheet = masterSS.getSheetByName(MASTER_SHEETS.USERS);
    sheet.getRange(ctx.rowIdx, 4).setValue(target.userId);
    sheet.getRange(target.rowIdx, 4).setValue(userId);
    
    return { status: 'success', linkedUserId: target.userId };
  } else {
    // Create Pending
    const pSheet = masterSS.getSheetByName(MASTER_SHEETS.PENDING_LINKS);
    pSheet.appendRow([userId, String(targetUsername).toLowerCase(), new Date()]);
    return { status: 'pending', message: "Invite sent" };
  }
}

// --- PRIVATE DATA (Single Write) ---

function saveItems(userId, type, items) {
  if (!items || items.length === 0) return { status: 'success' };
  
  const ctx = getUserContext(userId);
  const ss = SpreadsheetApp.openById(ctx.spreadsheetId);
  let sheetName;
  
  if(type==='reports') sheetName=USER_SHEETS.REPORTS;
  else if(type==='templates') sheetName=USER_SHEETS.TEMPLATES;
  else if(type==='documents') sheetName=USER_SHEETS.DOCUMENTS;
  else if(type==='profile') sheetName=USER_SHEETS.PROFILE;
  else throw new Error("Invalid type");

  const sheet = ss.getSheetByName(sheetName);
  
  if (type === 'profile') {
    const p = JSON.stringify(items[0]);
    if (sheet.getLastRow() > 1) sheet.getRange(2, 2, 1, 2).setValues([[p, new Date()]]);
    else sheet.appendRow([userId, p, new Date()]);
    return { status: 'success' };
  }

  // Batch Save logic
  const existing = sheet.getDataRange().getValues();
  const idMap = new Map();
  for(let i=1; i<existing.length; i++) idMap.set(String(existing[i][0]), i+1);
  
  const inserts = [], updates = [], ts = new Date();
  
  items.forEach(item => {
    let row;
    if (type === 'documents') {
      let fid = idMap.has(item.id) ? existing[idMap.get(item.id)-1][3] : "";
      if (item.data) { // New file upload
        const blob = Utilities.newBlob(Utilities.base64Decode(item.data), item.mimeType, item.name);
        // Save to USER'S private folder
        fid = DriveApp.getFolderById(ctx.folderId).createFile(blob).getId();
      }
      const meta = JSON.stringify({id:item.id, name:item.name, mimeType:item.mimeType, createdAt:item.createdAt, folder:item.folder, structuredData:item.structuredData});
      row = [item.id, userId, meta, fid, ts, false];
    } else {
      row = [item.id, userId, JSON.stringify(item), item.createdAt ? new Date(item.createdAt) : ts, ts, false];
    }
    
    if(idMap.has(item.id)) updates.push({r:idMap.get(item.id), v:row});
    else inserts.push(row);
  });

  if (inserts.length) sheet.getRange(sheet.getLastRow()+1, 1, inserts.length, inserts[0].length).setValues(inserts);
  updates.forEach(u => sheet.getRange(u.r, 1, 1, u.v.length).setValues([u.v]));
  
  return { status: 'success' };
}

// --- SHARED DATA (Dual Write) ---

function sendMessage(userId, content, threadId, subject) {
  const ctx = getUserContext(userId);
  const msgId = Utilities.getUuid();
  const ts = new Date().toISOString();
  
  // 1. Write to My Sheet
  const mySS = SpreadsheetApp.openById(ctx.spreadsheetId);
  const row = [msgId, userId, ctx.linkedUserId || "", content, ts, 'unread', threadId || "", subject || ""];
  appendRowSafe(mySS, USER_SHEETS.MESSAGES, row);
  
  // 2. Write to Their Sheet (if linked)
  if (ctx.linkedUserId) {
    try {
      const linkedCtx = getUserContext(ctx.linkedUserId);
      const theirSS = SpreadsheetApp.openById(linkedCtx.spreadsheetId);
      appendRowSafe(theirSS, USER_SHEETS.MESSAGES, row);
    } catch(e) {
      Logger.log("Failed to sync message to linked user: " + e);
    }
  }
  
  return { status: 'success', message: { id: msgId, senderId: userId, recipientId: ctx.linkedUserId, content, timestamp: ts, threadId: threadId || "", subject: subject || "" } };
}

function getMessages(userId, after) {
  const ctx = getUserContext(userId);
  const ss = SpreadsheetApp.openById(ctx.spreadsheetId);
  const sheet = ss.getSheetByName(USER_SHEETS.MESSAGES);
  if(!sheet) return { status: 'success', messages: [] };
  
  const data = sheet.getDataRange().getValues();
  const res = [];
  for(let i=1; i<data.length; i++) {
    const ts = data[i][4];
    if (!after || ts > after) {
      res.push({
        id: data[i][0],
        senderId: data[i][1],
        recipientId: data[i][2],
        content: data[i][3],
        timestamp: ts,
        readStatus: data[i][5],
        threadId: data[i][6] || "",
        subject: data[i][7] || ""
      });
    }
  }
  return { status: 'success', messages: res };
}

function saveSharedEventsBatch(userId, events) {
  const ctx = getUserContext(userId);
  
  // 1. Save to My Sheet
  processEventsForSS(ctx.spreadsheetId, userId, ctx.linkedUserId, events);
  
  // 2. Save to Their Sheet
  if (ctx.linkedUserId) {
    try {
      const linkedCtx = getUserContext(ctx.linkedUserId);
      processEventsForSS(linkedCtx.spreadsheetId, userId, ctx.linkedUserId, events);
    } catch(e) {
      Logger.log("Failed to sync event: " + e);
    }
  }
  return { status: 'success' };
}

function processEventsForSS(ssId, modifierId, otherId, events) {
  const ss = SpreadsheetApp.openById(ssId);
  const sheet = ss.getSheetByName(USER_SHEETS.SHARED_EVENTS);
  const existing = sheet.getDataRange().getValues();
  const idMap = new Map(); // ID -> {row, creatorId}
  
  for(let i=1; i<existing.length; i++) {
    idMap.set(String(existing[i][0]), { row: i+1, creatorId: existing[i][1] });
  }
  
  const inserts = [], updates = [], ts = new Date();
  const participants = JSON.stringify([modifierId, otherId].filter(Boolean));

  events.forEach(e => {
    let creatorId = modifierId;
    let rIdx = -1;
    
    if(idMap.has(e.id)) {
      const ex = idMap.get(e.id);
      creatorId = ex.creatorId; // Preserve original creator
      rIdx = ex.row;
    }
    
    // Cols: id, creator_id, participants, data, start_time, updated_at
    const row = [e.id, creatorId, participants, JSON.stringify(e), e.start, ts];
    
    if(rIdx > 0) updates.push({r: rIdx, v: row});
    else inserts.push(row);
  });

  if(inserts.length) sheet.getRange(sheet.getLastRow()+1, 1, inserts.length, inserts[0].length).setValues(inserts);
  updates.forEach(u => sheet.getRange(u.r, 1, 1, u.v.length).setValues([u.v]));
}

function getSharedEvents(userId) {
  const ctx = getUserContext(userId);
  const ss = SpreadsheetApp.openById(ctx.spreadsheetId);
  return { status: 'success', events: getSharedEventsList(ss) };
}

function getSharedEventsList(ss) {
  const sheet = ss.getSheetByName(USER_SHEETS.SHARED_EVENTS);
  if(!sheet) return [];
  const data = sheet.getDataRange().getValues();
  const res = [];
  for(let i=1; i<data.length; i++) {
    try { res.push(JSON.parse(data[i][3])); } catch(e){}
  }
  return res;
}

// --- UTILS ---

function appendRowSafe(ss, sheetName, row) {
  let sheet = ss.getSheetByName(sheetName);
  if(!sheet) sheet = ss.insertSheet(sheetName);
  sheet.appendRow(row);
}

function getDocumentContent(userId, docId) {
  const ctx = getUserContext(userId);
  const ss = SpreadsheetApp.openById(ctx.spreadsheetId);
  const sheet = ss.getSheetByName(USER_SHEETS.DOCUMENTS);
  const data = sheet.getDataRange().getValues();
  
  for(let i=1; i<data.length; i++) {
    if(String(data[i][0]) === String(docId)) {
      const fid = data[i][3];
      const blob = DriveApp.getFileById(fid).getBlob();
      return { status: 'success', data: Utilities.base64Encode(blob.getBytes()) };
    }
  }
  throw new Error("Document not found");
}
