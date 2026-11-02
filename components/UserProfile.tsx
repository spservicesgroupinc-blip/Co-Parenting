
import React, { useState } from 'react';
import { UserProfile as UserProfileType } from '../types';
import { XMarkIcon } from './icons';


interface UserProfileProps {
    onSave: (profile: UserProfileType) => void;
    onCancel: () => void;
    currentProfile: UserProfileType | null;
    isInitialSetup?: boolean;
    userId?: string;
    onRefreshData?: () => void;
    onConnectParent: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ onSave, onCancel, currentProfile, isInitialSetup, userId, onConnectParent }) => {
    const [name, setName] = useState(currentProfile?.name || '');
    const [role, setRole] = useState<'Mother' | 'Father' | ''>(currentProfile?.role || '');
    const [children, setChildren] = useState<string[]>(currentProfile?.children?.length ? currentProfile.children : ['']);
    const [causeNumber, setCauseNumber] = useState(currentProfile?.causeNumber || '');
    const [courtInfo, setCourtInfo] = useState(currentProfile?.courtInfo || '');

    const cancel = () => {
        setName(currentProfile?.name || '');
        setRole(currentProfile?.role || '');
        setChildren(currentProfile?.children?.length ? currentProfile.children : ['']);
        setCauseNumber(currentProfile?.causeNumber || '');
        setCourtInfo(currentProfile?.courtInfo || '');
        onCancel();
    };

    const handleChildChange = (index: number, value: string) => {
        const newChildren = [...children];
        newChildren[index] = value;
        setChildren(newChildren);
    };

    const addChildInput = () => setChildren([...children, '']);
    const removeChildInput = (index: number) => {
        if (children.length > 1) setChildren(children.filter((_, i) => i !== index));
        else setChildren(['']);
    };

    const handleSave = () => {
        if (!name.trim() || !role) {
            alert("Name and Role are required.");
            return;
        }
        onSave({
            name,
            role,
            children: children.filter(c => c.trim() !== ''),
            causeNumber,
            courtInfo,
            linkedUserId: currentProfile?.linkedUserId 
        });
    };

    return (
        <div className="bg-white p-6 sm:p-8 border border-gray-200 rounded-lg shadow-sm max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                {isInitialSetup ? 'Let’s get you started' : 'Your profile'}
            </h1>
            <p className="mt-2 text-base text-gray-700">Manage your case information and co-parent connection.</p>

            <div className="mt-8 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="profile-name" className="block text-sm font-medium text-gray-700">Your Name</label>
                        <input id="profile-name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="field mt-1" placeholder="e.g., Jane Doe" />
                    </div>
                    <div>
                        <label htmlFor="profile-role" className="block text-sm font-medium text-gray-700">Your Role</label>
                        <select id="profile-role" value={role} onChange={(e) => setRole(e.target.value as UserProfileType['role'])} className="field mt-1">
                            <option value="">-- Select Role --</option>
                            <option value="Mother">Mother</option>
                            <option value="Father">Father</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="profile-case" className="block text-sm font-medium text-gray-700">Cause / Case Number</label>
                        <input id="profile-case" type="text" value={causeNumber} onChange={(e) => setCauseNumber(e.target.value)} className="field mt-1" />
                    </div>
                    <div>
                        <label htmlFor="profile-court" className="block text-sm font-medium text-gray-700">Court / County</label>
                        <input id="profile-court" type="text" value={courtInfo} onChange={(e) => setCourtInfo(e.target.value)} className="field mt-1" />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Children's Names</label>
                    <div className="space-y-3 mt-1">
                        {children.map((child, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <input aria-label={`Child ${index + 1} name`} type="text" value={child} onChange={(e) => handleChildChange(index, e.target.value)} className="field" />
                                <button aria-label={`Remove child ${index + 1}`} onClick={() => removeChildInput(index)} className="p-3 text-gray-500 hover:text-red-600"><XMarkIcon className="w-5 h-5" /></button>
                            </div>
                        ))}
                    </div>
                    <button onClick={addChildInput} className="mt-3 px-3 py-1.5 text-sm font-medium text-blue-800 bg-blue-100 rounded-md">+ Add Child</button>
                </div>

                {userId && !isInitialSetup && (
                    <section className="pt-6 border-t border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900">Co-parent connection</h2>
                        <p className="text-sm text-gray-600 mt-2">{currentProfile?.linkedUserId ? 'Your accounts are connected for messages and calendar events.' : 'Invite your co-parent with a personal link or connect using their username.'}</p>
                        <button type="button" onClick={onConnectParent} className="btn-secondary mt-4">{currentProfile?.linkedUserId ? 'View connection' : 'Connect co-parent'}</button>
                    </section>
                )}
            </div>

            <div className="mt-8 pt-5 border-t border-gray-200 flex justify-end gap-3">
                {!isInitialSetup && <button onClick={cancel} className="px-4 py-2 text-sm text-gray-700 bg-white border rounded-md">Cancel</button>}
                <button onClick={handleSave} className="px-4 py-2 text-sm font-semibold text-white bg-blue-950 rounded-md">Save Profile</button>
            </div>
        </div>
    );
};

export default UserProfile;
