import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="home-dashboard">
      <section className="hero-section">
        <div className="hero-content">
          <h1>Pick Parts. Build Your PC. Compare and Share.</h1>
          <p>SpecSmart provides AI-driven recommendations, compatibility guidance, and price tracking for your next computer build.</p>
          <Link to="/builder" className="cta-button">Start Your System Build</Link>
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="grid-card featured-guides">
          <div className="card-header">
            <h3>Featured Build Guides</h3>
            <a href="#">View All</a>
          </div>
          <div className="guide-list">
            <div className="guide-item">
              <div className="guide-img placeholder-img"></div>
              <div className="guide-info">
                <h4>Entry Level Gaming Build</h4>
                <p>AMD Ryzen 5 5600 · Radeon RX 6600</p>
              </div>
            </div>
            <div className="guide-item">
              <div className="guide-img placeholder-img"></div>
              <div className="guide-info">
                <h4>Excellent AMD Gaming Build</h4>
                <p>AMD Ryzen 5 7600X · Radeon RX 7800 XT</p>
              </div>
            </div>
            <div className="guide-item">
              <div className="guide-img placeholder-img"></div>
              <div className="guide-info">
                <h4>Glorious Intel Gaming Build</h4>
                <p>Intel Core i7-14700K · GeForce RTX 4080</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid-card">
          <div className="card-header">
            <h3>Completed Builds</h3>
            <a href="#">View All</a>
          </div>
          <div className="build-list">
            <div className="build-item">
              <span className="build-name">Snow White O11</span>
              <span className="build-price">Rs. 2,50,000</span>
            </div>
            <div className="build-item">
              <span className="build-name">Budget Behemoth</span>
              <span className="build-price">Rs. 85,000</span>
            </div>
            <div className="build-item">
              <span className="build-name">Workstation v3</span>
              <span className="build-price">Rs. 4,20,000</span>
            </div>
          </div>
        </div>

        <div className="grid-card">
          <div className="card-header">
            <h3>Trending Parts</h3>
          </div>
          <ul className="trending-list">
            <li>AMD Ryzen 7 7800X3D</li>
            <li>NVIDIA GeForce RTX 4090</li>
            <li>Samsung 990 Pro 2TB</li>
            <li>Lian Li O11 Dynamic Evo</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
