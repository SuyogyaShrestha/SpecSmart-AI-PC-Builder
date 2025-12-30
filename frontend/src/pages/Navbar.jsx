import { Link, useNavigate } from "react-router-dom";

export default function Navbar({ user }) {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/");
    window.location.reload();
  };

  return (
    <header className="site-header">
      {/* TOP ROW: Logo and Auth */}
      <div className="header-top">
        <div className="header-container">
          <Link to="/" className="site-logo">
            <span className="logo-icon">S</span> SpecSmart
          </Link>

          <div className="header-auth">
            {!user ? (
              <>
                <Link to="/login" className="auth-link">Log In</Link>
                <Link to="/register" className="auth-btn">Register</Link>
              </>
            ) : (
              <div className="user-menu">
                <Link
                  to={user.role === "ADMIN" ? "/admin" : "/user"}
                  className="auth-btn"
                  style={{ background: 'transparent', color: 'inherit', padding: 0 }}
                >
                  <span className="user-name">{user.username}</span>
                </Link>
                <button onClick={logout} className="logout-btn">Log Out</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM ROW: Nav Links + Search (below, like PCPP but harmonized) */}
      <nav className="header-nav">
        <div className="nav-row-container">
          <ul className="nav-menu">
            <li><Link to="/builder">System Builder</Link></li>
            <li><a href="#">Build Guides</a></li>
            <li><a href="#">Completed Builds</a></li>
            <li><a href="#">Parts</a></li>
          </ul>

          <div className="header-search">
            <input type="text" placeholder="Search parts..." />
          </div>
        </div>
      </nav>
    </header>
  );
}
