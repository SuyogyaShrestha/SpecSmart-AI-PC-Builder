import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function UserDashboard({ user }) {
  const [activeTab, setActiveTab] = useState("overview");
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  return (
    <div className="dashboard-layout">
      {/* SIDEBAR */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-user">
          <h3>{user?.username}</h3>
          <p>Standard Member</p>
        </div>
        <ul className="sidebar-nav">
          <li>
            <button
              className={activeTab === "overview" ? "active" : ""}
              onClick={() => setActiveTab("overview")}
            >
              Overview
            </button>
          </li>
          <li>
            <button
              className={activeTab === "saved" ? "active" : ""}
              onClick={() => setActiveTab("saved")}
            >
              Saved Builds
            </button>
          </li>
          <li>
            <button onClick={() => alert("Settings coming soon!")}>
              Account Settings
            </button>
          </li>
          <li style={{ marginTop: 'auto', borderTop: '1px solid #eee' }}>
            <button onClick={handleLogout} style={{ color: '#dc2626' }}>
              Log Out
            </button>
          </li>
        </ul>
      </aside>

      {/* MAIN CONTENT */}
      <main className="dashboard-main">
        {activeTab === "overview" && (
          <div>
            <div className="dashboard-header">
              <h2>Dashboard Overview</h2>
              <p>Welcome back to SpecSmart.</p>
            </div>

            <div className="section-card">
              <h3 className="section-title">Jump Back In</h3>
              <p style={{ color: '#6b7280', marginBottom: 20 }}>
                Ready to build your next PC? Check out our AI builder or browse parts.
              </p>
              <Link to="/builder" className="generate-btn" style={{ display: 'inline-block', textDecoration: 'none' }}>
                Start a New Build
              </Link>
            </div>
          </div>
        )}

        {activeTab === "saved" && (
          <div>
            <div className="dashboard-header">
              <h2>Saved Builds</h2>
              <p>Your saved configurations and part lists.</p>
            </div>

            <div className="section-card">
              <p style={{ fontStyle: 'italic', color: '#6b7280' }}>
                You haven't saved any builds yet. Go to the System Builder to create one!
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
