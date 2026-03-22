import { useCallback, useEffect, useState } from "react";

export default function DashboardPage({ auth, fetchWithAuth, onLogout }) {
  const [profile, setProfile] = useState(null);
  const [adminData, setAdminData] = useState({ total_users: 0, users: [] });
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [status, setStatus] = useState({ type: "idle", message: "" });

  const isAdmin = auth.user?.role === "admin";

  const loadProfile = useCallback(async () => {
    try {
      setIsLoadingProfile(true);
      const response = await fetchWithAuth("/api/profile");
      const data = await response.json();
      if (!response.ok) {
        setStatus({
          type: "error",
          message: data.detail || "Unable to load profile.",
        });
        return;
      }
      setProfile(data);
    } catch (error) {
      if (error.message !== "Session expired.") {
        setStatus({
          type: "error",
          message: error.message || "Unable to load profile.",
        });
      }
    } finally {
      setIsLoadingProfile(false);
    }
  }, [fetchWithAuth]);

  const loadUsers = useCallback(async () => {
    if (!isAdmin) return;
    try {
      setIsLoadingUsers(true);
      const response = await fetchWithAuth("/api/admin/users");
      const data = await response.json();
      if (!response.ok) {
        setStatus({
          type: "error",
          message: data.detail || "Unable to load users.",
        });
        return;
      }
      setAdminData(data);
    } catch (error) {
      if (error.message !== "Session expired.") {
        setStatus({
          type: "error",
          message: error.message || "Unable to load users.",
        });
      }
    } finally {
      setIsLoadingUsers(false);
    }
  }, [fetchWithAuth, isAdmin]);

  useEffect(() => {
    loadProfile();
    if (isAdmin) loadUsers();
  }, [loadProfile, loadUsers, isAdmin]);

  const user = profile || auth.user;
  const initials = (user?.full_name || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const [timeLeft, setTimeLeft] = useState(
    auth.expiresAt ? Math.max(0, auth.expiresAt - Date.now()) : 0
  );

  useEffect(() => {
    if (!auth.expiresAt) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, auth.expiresAt - Date.now());
      setTimeLeft(remaining);
      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [auth.expiresAt]);

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);
  const formattedTime = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  const filteredUsers = adminData.users.filter((u) => {
    const term = searchTerm.toLowerCase();
    return (
      u.username.toLowerCase().includes(term) ||
      u.full_name.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term)
    );
  });

  const adminCount = adminData.users.filter((u) => u.role === "admin").length;

  return (
    <div className="dashboard-page">
      {status.message && status.type !== "idle" && (
        <div className={`status-banner ${status.type}`}>{status.message}</div>
      )}

      {/* Welcome Banner */}
      <div className="welcome-banner">
        <div className="welcome-avatar">{initials}</div>
        <div className="welcome-text">
          <h1>Welcome, {user?.full_name || "User"} 👋</h1>
          <p>
            Signed in as <strong>@{user?.username}</strong> &middot;{" "}
            <span className={`role-badge role-${user?.role}`}>
              {user?.role}
            </span>
          </p>
        </div>
        <button type="button" className="btn-logout" onClick={onLogout}>
          ⏻ Logout
        </button>
      </div>

      {/* Profile + Session Cards */}
      <div className="dashboard-grid">
        <div className="dash-card profile-detail-card">
          <h2>📋 Profile Details</h2>
          <div className="profile-fields">
            <div className="profile-field">
              <span className="field-label">Username</span>
              <span className="field-value">{user?.username}</span>
            </div>
            <div className="profile-field">
              <span className="field-label">Full Name</span>
              <span className="field-value">{user?.full_name}</span>
            </div>
            <div className="profile-field">
              <span className="field-label">Email</span>
              <span className="field-value">{user?.email}</span>
            </div>
            <div className="profile-field">
              <span className="field-label">Role</span>
              <span className="field-value">
                <span className={`role-badge role-${user?.role}`}>
                  {user?.role}
                </span>
              </span>
            </div>
          </div>
          <button
            className="btn-secondary"
            onClick={loadProfile}
            disabled={isLoadingProfile}
          >
            {isLoadingProfile ? "Refreshing..." : "🔄 Refresh Profile"}
          </button>
        </div>

        <div className="dash-card session-card">
          <h2>⏱️ Session Info</h2>
          <div className="session-timer">
            <div className="timer-circle">
              <span className="timer-value">{formattedTime}</span>
              <span className="timer-label">time left</span>
            </div>
          </div>
          <p className="session-note">
            Your session will automatically expire. You will be logged out and
            redirected to the login page.
          </p>
        </div>
      </div>

      {/* Admin Section */}
      {isAdmin && (
        <div className="admin-section">
          <div className="admin-header">
            <h2>🛡️ Admin Dashboard</h2>
            <button
              className="btn-secondary"
              onClick={loadUsers}
              disabled={isLoadingUsers}
            >
              {isLoadingUsers ? "Loading..." : "🔄 Refresh"}
            </button>
          </div>

          <div className="stats-row">
            <div className="stat-card">
              <span className="stat-number">{adminData.total_users}</span>
              <span className="stat-label">Total Users</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">{adminCount}</span>
              <span className="stat-label">Admins</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">
                {adminData.total_users - adminCount}
              </span>
              <span className="stat-label">Regular Users</span>
            </div>
          </div>

          <div className="users-table-wrapper">
            <div className="table-toolbar">
              <div className="input-wrapper search-input-wrapper">
                <span className="input-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search users by name, username, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="table-scroll">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Username</th>
                    <th>Full Name</th>
                    <th>Email</th>
                    <th>Role</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="empty-row">
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id}>
                        <td>{u.id}</td>
                        <td>
                          <strong>{u.username}</strong>
                        </td>
                        <td>{u.full_name}</td>
                        <td>{u.email}</td>
                        <td>
                          <span className={`role-badge role-${u.role}`}>
                            {u.role}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
