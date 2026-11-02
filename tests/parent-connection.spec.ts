import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

async function mockBackend(page: Page, linkResult: object = { status: 'success', linkedUserId: 'other-parent' }, newAccount = false) {
    const linkRequests: object[] = [];
    let linkedUserId: string | null = null;
    let profile = newAccount ? null : { name: 'Test Parent', role: 'Mother', children: ['Child'], tier: 'Free', tokens: 50, linkedUserId: null };
    await page.route('**/test-api?*', async route => {
        const body = route.request().postDataJSON();
        let response: object = { status: 'success' };
        if (body.action === 'login' || body.action === 'signup') response = { status: 'success', userId: 'test-parent', username: 'testparent' };
        if (body.action === 'sync') response = { status: 'success', data: { profile, reports: [], documents: [], templates: [], linkedUserId } };
        if (body.action === 'getMessages') response = { messages: [] };
        if (body.action === 'getSharedEvents') response = { events: [] };
        if (body.action === 'saveItems' && body.type === 'profile') profile = body.items[0];
        if (body.action === 'linkByUsername') {
            linkRequests.push(body);
            response = linkResult;
            if ('linkedUserId' in linkResult) linkedUserId = String(linkResult.linkedUserId);
        }
        await route.fulfill({ json: response });
    });
    return linkRequests;
}

async function login(page: Page, path = '/') {
    await page.goto(path);
    await page.getByLabel('Username', { exact: true }).fill('testparent');
    await page.getByLabel('Password', { exact: true }).fill('test-password');
    await page.getByRole('button', { name: 'Log In', exact: true }).last().click();
}

test('a pending link response is preserved instead of appearing connected', async ({ page }) => {
    await page.route('**/test-api?*', route => route.fulfill({
        json: { status: 'pending', message: 'Invite sent' },
    }));
    await page.goto('/');
    const result = await page.evaluate(async () => {
        const modulePath = '/services/api.ts';
        const { api } = await import(/* @vite-ignore */ modulePath);
        return api.linkByUsername('test-parent', 'other-parent');
    });
    expect(result).toEqual({ status: 'pending' });
});

test('invite survives sign-in and only connects after confirmation', async ({ page }) => {
    const requests = await mockBackend(page);
    await login(page, '/?connect=otherparent');
    await expect(page.getByRole('heading', { name: 'Co-parent connection', exact: true })).toBeVisible();
    await expect(page.getByLabel('Co-parent’s username')).toHaveValue('otherparent');
    expect(requests).toHaveLength(0);
    await page.getByRole('button', { name: 'Connect accounts' }).click();
    await expect(page.getByRole('heading', { name: 'Your accounts are connected' })).toBeVisible();
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({ targetUsername: 'otherparent' });
    await expect(page).not.toHaveURL(/connect=/);
    await page.getByRole('button', { name: 'Open messages' }).click();
    await expect(page.getByRole('button', { name: 'New Subject' })).toBeVisible();
    await page.screenshot({ path: 'test-results/messages-desktop.png' });
    await page.getByRole('navigation', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Family calendar' }).click();
    await expect(page.getByRole('button', { name: 'Shared Schedule' })).toBeVisible();
});

test('missing username stays pending and can be checked without another link request', async ({ page }) => {
    const requests = await mockBackend(page, { status: 'pending', message: 'Invite sent' });
    await login(page);
    await page.getByRole('button', { name: 'Connect co-parent', exact: true }).click();
    await page.getByText('Already know their username?', { exact: true }).click();
    await page.getByLabel('Co-parent’s username').fill('not-registered');
    await page.getByRole('button', { name: 'Connect accounts' }).click();
    await expect(page.getByText('Waiting for @not-registered to create an account')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Your accounts are connected' })).not.toBeVisible();
    await page.getByRole('button', { name: 'Check connection', exact: true }).click();
    await expect(page.getByText('No connection yet.', { exact: false })).toBeVisible();
    expect(requests).toHaveLength(1);
});

test('errors and self-linking never show a successful connection', async ({ page }) => {
    const requests = await mockBackend(page, { status: 'error', message: 'Please try again.' });
    await login(page, '/?connect=testparent');
    await page.getByRole('button', { name: 'Connect accounts' }).click();
    await expect(page.getByRole('alert')).toContainText('That is your username');
    expect(requests).toHaveLength(0);
    await page.getByLabel('Co-parent’s username').fill('otherparent');
    await page.getByRole('button', { name: 'Connect accounts' }).click();
    await expect(page.getByRole('alert')).toContainText('Please try again');
    await expect(page.getByRole('heading', { name: 'Your accounts are connected' })).not.toBeVisible();
});

test('invite survives signup and first-time profile setup', async ({ page }) => {
    const requests = await mockBackend(page, undefined, true);
    await page.goto('/?connect=otherparent');
    await page.getByRole('button', { name: 'Sign Up', exact: true }).click();
    await page.getByLabel('Username', { exact: true }).fill('testparent');
    await page.getByLabel('Email Address').fill('test@example.com');
    await page.getByLabel('Password', { exact: true }).fill('test-password');
    await page.getByLabel('Confirm Password', { exact: true }).fill('test-password');
    await page.getByRole('button', { name: 'Create Account', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Let’s get you started' })).toBeVisible();
    await page.getByPlaceholder('e.g., Jane Doe').fill('New Parent');
    await page.getByRole('combobox').selectOption('Mother');
    await page.getByRole('button', { name: 'Save Profile' }).click();
    await expect(page.getByLabel('Co-parent’s username')).toHaveValue('otherparent');
    expect(requests).toHaveLength(0);
});

test('phone navigation and connection screen fit without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 740 });
    await mockBackend(page);
    await login(page);
    await expect(page.getByRole('heading', { name: 'Welcome back, Test.' })).toBeVisible();
    await page.screenshot({ path: 'test-results/home-phone.png' });
    await page.getByRole('button', { name: 'Connect co-parent', exact: true }).click();
    await expect(page.getByLabel('Your co-parent invite link')).toHaveValue(/connect=testparent/);
    await page.screenshot({ path: 'test-results/connection-phone.png' });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Main navigation' })).toBeVisible();
    await page.getByRole('button', { name: 'Close navigation' }).press('Escape');
    await expect(page.getByRole('dialog', { name: 'Main navigation' })).not.toBeVisible();
});

test('profile edits survive connecting and saving does not clear the connection', async ({ page }) => {
    await mockBackend(page);
    await login(page);
    await page.getByRole('button', { name: 'Open user menu' }).click();
    await page.getByRole('button', { name: 'My Profile', exact: true }).click();
    await page.getByLabel('Your Name', { exact: true }).fill('Edited Parent');
    await page.getByRole('button', { name: 'Connect co-parent', exact: true }).last().click();
    await page.getByText('Already know their username?', { exact: true }).click();
    await page.getByLabel('Co-parent’s username').fill('otherparent');
    await page.getByRole('button', { name: 'Connect accounts' }).click();
    await expect(page.getByRole('heading', { name: 'Your accounts are connected' })).toBeVisible();
    await page.getByRole('button', { name: 'Open user menu' }).click();
    await page.getByRole('button', { name: 'My Profile', exact: true }).click();
    await expect(page.getByLabel('Your Name', { exact: true })).toHaveValue('Edited Parent');
    await page.getByRole('button', { name: 'Save Profile' }).click();
    await expect(page.getByRole('heading', { name: 'Your co-parent is connected' })).toBeVisible();
});

test('invite link copies the sign-in username and offline linking is disabled', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await mockBackend(page);
    await login(page);
    await page.getByRole('button', { name: 'Connect co-parent', exact: true }).click();
    await page.getByRole('button', { name: 'Copy invite link', exact: true }).click();
    await expect(page.getByText('Invite link copied.', { exact: false })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('http://127.0.0.1:4317/?connect=testparent');
    await page.getByText('Already know their username?', { exact: true }).click();
    await page.getByLabel('Co-parent’s username').fill('otherparent');
    await context.setOffline(true);
    await expect(page.getByRole('button', { name: 'Connect accounts' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Check connection', exact: true })).toBeDisabled();
});
