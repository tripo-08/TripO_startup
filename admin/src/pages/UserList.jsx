import React, { useEffect, useState } from 'react';
import { Trash2, Check, X, Ban } from 'lucide-react';

const UserList = ({ type }) => { // type: 'passenger' | 'provider'
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // ✅ Correct backend base URL (Render)
    const API = import.meta.env.VITE_API_URL;

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');

            const response = await fetch(
                `${API}/api/admin/users?type=${type}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const data = await response.json();

            if (data.success) {
                setUsers(data.data);
            } else {
                setError('Failed to fetch users');
            }

        } catch (error) {
            console.error('Error fetching users:', error);
            setError('Network error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [type]);

    const handleDelete = async (userId) => {

        if (!window.confirm(
            'Are you sure you want to delete this user? This action cannot be undone.'
        )) return;

        try {
            const token = localStorage.getItem('adminToken');

            const response = await fetch(
                `${API}/api/admin/user/${userId}`,
                {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const data = await response.json();

            if (data.success) {
                setUsers(users.filter(user => user.uid !== userId));
            } else {
                alert('Failed to delete user');
            }

        } catch (error) {
            console.error('Error deleting user:', error);
        }
    };

    const handleUpdateStatus = async (userId, action, value) => {

        try {
            const token = localStorage.getItem('adminToken');

            const response = await fetch(
                `${API}/api/admin/user/${userId}`,
                {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ action, value })
                }
            );

            const data = await response.json();

            if (data.success) {
                fetchUsers(); // refresh list
            } else {
                alert('Failed to update status');
            }

        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    if (loading)
        return <div className="text-white">Loading users...</div>;

    if (error)
        return <div className="text-red-500">{error}</div>;

    return (
        <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-gray-300">

                    <thead className="bg-gray-700 text-gray-100 uppercase text-xs font-semibold">
                        <tr>
                            <th className="px-6 py-4">User</th>
                            <th className="px-6 py-4">Contact</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-700">

                        {users.map((user) => (

                            <tr key={user.uid} className="hover:bg-gray-750">

                                <td className="px-6 py-4">

                                    <div className="flex items-center space-x-3">

                                        <div className="bg-gray-600 rounded-full w-10 h-10 flex items-center justify-center overflow-hidden">

                                            {user.photoURL ? (

                                                <img
                                                    src={user.photoURL}
                                                    alt={user.displayName}
                                                    className="w-full h-full object-cover"
                                                />

                                            ) : (

                                                <span className="text-xl font-bold text-gray-300">
                                                    {user.displayName
                                                        ? user.displayName[0]
                                                        : 'U'}
                                                </span>

                                            )}

                                        </div>

                                        <div>

                                            <div className="font-bold text-white">
                                                {user.displayName || 'No Name'}
                                            </div>

                                            <div className="text-xs text-gray-400 capitalize">
                                                {user.role}
                                            </div>

                                        </div>

                                    </div>

                                </td>

                                <td className="px-6 py-4 text-sm">
                                    <div>{user.email}</div>
                                    <div className="text-gray-500">
                                        {user.phoneNumber || 'No phone'}
                                    </div>
                                </td>

                                <td className="px-6 py-4">

                                    {user.isVerified ? (

                                        <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded">
                                            Verified
                                        </span>

                                    ) : (

                                        <span className="px-2 py-1 text-xs bg-yellow-500/20 text-yellow-400 rounded">
                                            Unverified
                                        </span>

                                    )}

                                </td>

                                <td className="px-6 py-4 text-right">

                                    <div className="flex justify-end gap-2">

                                        {!user.isVerified ? (

                                            <button
                                                onClick={() =>
                                                    handleUpdateStatus(
                                                        user.uid,
                                                        'verify',
                                                        true
                                                    )
                                                }
                                                className="p-2 text-green-400 hover:bg-green-500/20 rounded"
                                            >
                                                <Check size={18}/>
                                            </button>

                                        ) : (

                                            <button
                                                onClick={() =>
                                                    handleUpdateStatus(
                                                        user.uid,
                                                        'verify',
                                                        false
                                                    )
                                                }
                                                className="p-2 text-yellow-400 hover:bg-yellow-500/20 rounded"
                                            >
                                                <X size={18}/>
                                            </button>

                                        )}

                                        <button
                                            onClick={() =>
                                                handleUpdateStatus(
                                                    user.uid,
                                                    'block',
                                                    !user.disabled
                                                )
                                            }
                                            className="p-2 text-gray-400 hover:bg-gray-500/20 rounded"
                                        >
                                            <Ban size={18}/>
                                        </button>

                                        <button
                                            onClick={() =>
                                                handleDelete(user.uid)
                                            }
                                            className="p-2 text-red-400 hover:bg-red-500/20 rounded"
                                        >
                                            <Trash2 size={18}/>
                                        </button>

                                    </div>

                                </td>

                            </tr>

                        ))}

                        {users.length === 0 && (

                            <tr>
                                <td colSpan="4"
                                    className="text-center py-8 text-gray-500">
                                    No users found.
                                </td>
                            </tr>

                        )}

                    </tbody>

                </table>
            </div>
        </div>
    );
};

export default UserList;