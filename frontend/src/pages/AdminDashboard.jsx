import { useState } from "react";
import { Link } from "react-router-dom";

export default function AdminDashboard({ user }) {
  const [activeTab, setActiveTab] = useState("overview");

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
          <p style={{ color: 'var(--accent)', fontWeight: 600 }}>Administrator</p>
        </div>
        <ul className="sidebar-nav">
          <li>
            <button
              className={activeTab === "overview" ? "active" : ""}
              onClick={() => setActiveTab("overview")}
            >
              Analytics Overview
            </button>
          </li>
          <li>
            <button
              className={activeTab === "parts" ? "active" : ""}
              onClick={() => setActiveTab("parts")}
            >
              Part Management
            </button>
          </li>
          <li>
            <button
              className={activeTab === "users" ? "active" : ""}
              onClick={() => setActiveTab("users")}
            >
              User Management
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
              <h2>Platform Analytics</h2>
              <p>Overview of SpecSmart performance.</p>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <h4>Total Users</h4>
                <div className="stat-value">1,248</div>
                <div className="stat-change up">↑ 12% from last month</div>
              </div>
              <div className="stat-card">
                <h4>Completed Builds</h4>
                <div className="stat-value">856</div>
                <div className="stat-change up">↑ 8% from last month</div>
              </div>
              <div className="stat-card">
                <h4>Active Parts</h4>
                <div className="stat-value">4,302</div>
                <div className="stat-change">Updated today</div>
              </div>
              <div className="stat-card">
                <h4>Revenue (Est)</h4>
                <div className="stat-value">Rs. 0</div>
                <div className="stat-change">Non-profit</div>
              </div>
            </div>

            <div className="section-card">
              <h3 className="section-title">Recent System Activity</h3>
              <p style={{ color: '#6b7280' }}>No recent critical alerts.</p>
            </div>
          </div>
        )}

        {activeTab === "parts" && (
          <div>
            <div className="dashboard-header">
              <h2>Part Management</h2>
              <p>Add, edit, or remove PC components from the database.</p>
            </div>

            <div className="section-card">
              <button className="generate-btn" style={{ marginBottom: 20 }}>
                + Add New Component
              </button>

              <table className="parts-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Price</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>101</td>
                    <td>AMD Ryzen 7 7800X3D</td>
                    <td>CPU</td>
                    <td>Rs. 65,000</td>
                    <td><button className="action-btn">Edit</button></td>
                  </tr>
                  <tr>
                    <td>102</td>
                    <td>NVIDIA GeForce RTX 4090</td>
                    <td>GPU</td>
                    <td>Rs. 320,000</td>
                    <td><button className="action-btn">Edit</button></td>
                  </tr>
                  <tr>
                    <td>103</td>
                    <td>Corsair Vengeance 32GB</td>
                    <td>RAM</td>
                    <td>Rs. 18,500</td>
                    <td><button className="action-btn">Edit</button></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "users" && (
          <div>
            <div className="dashboard-header">
              <h2>User Management</h2>
              <p>Manage user accounts and permissions.</p>
            </div>
            <div className="section-card">
              <p>User list placeholder...</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
