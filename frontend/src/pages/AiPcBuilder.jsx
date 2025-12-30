import { useState } from "react";

export default function AiPcBuilder() {
  const [budget, setBudget] = useState("");
  const [useCase, setUseCase] = useState("gaming");
  const [preferences, setPreferences] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Initial empty state (and it stays empty for now)
  const [build, setBuild] = useState({
    CPU: null,
    "CPU Cooler": null,
    Motherboard: null,
    Memory: null,
    Storage: null,
    "Video Card": null,
    "Power Supply": null,
    Case: null,
  });

  const handleGenerate = () => {
    // Static mock action - no generation
    alert("AI generation is currently disabled. This is a static UI demo.");
  };

  const calculateTotal = () => {
    // Will be 0 for now
    return Object.values(build).reduce((acc, part) => acc + (part?.price || 0), 0);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR' }).format(amount).replace('NPR', 'Rs.');
  };

  return (
    <div className="builder-wrapper">
      <div className="builder-container">
        <div className="builder-header">
          <h1>AI PC Builder</h1>
          <p>Tell us what you need, and we'll design the perfect PC for you.</p>
        </div>

        <div className="builder-inputs">
          <div className="input-group">
            <label>Budget (NPR)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="range"
                min="50000"
                max="1000000"
                step="5000"
                value={budget || 50000}
                onChange={(e) => setBudget(Number(e.target.value))}
                style={{ flex: 1, cursor: 'pointer' }}
              />
              <input
                type="number"
                placeholder="e.g. 150000"
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                style={{ width: '120px' }}
              />
            </div>
          </div>

          <div className="input-group">
            <label>Primary Use</label>
            <select value={useCase} onChange={(e) => setUseCase(e.target.value)}>
              <option value="gaming">Gaming</option>
              <option value="productivity">Workstation / Productivity</option>
              <option value="streaming">Streaming & Editing</option>
              <option value="coding">Programming / Dev</option>
              <option value="general">Home / General Use</option>
            </select>
          </div>

          <div className="input-group full-width">
            <label>Specific Preferences</label>
            <textarea
              placeholder="e.g. I want an all-white build, lots of RGB, and liquid cooling."
              value={preferences}
              onChange={(e) => setPreferences(e.target.value)}
            />
          </div>

          <div className="input-group full-width" style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
            <button
              className="generate-btn"
              onClick={handleGenerate}
              disabled={isGenerating}
              style={{ width: 'auto', minWidth: '200px' }}
            >
              Generate Build
            </button>
          </div>
        </div>

        <div className="build-results">
          <div className="results-header">
            <h2>Your Configuration</h2>
            <div className="total-price">
              Estimated Total: <span>{formatCurrency(calculateTotal())}</span>
            </div>
          </div>

          <table className="parts-table">
            <thead>
              <tr>
                <th>Component</th>
                <th>Selection</th>
                <th>Price</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(build).map(([type, part]) => (
                <tr key={type}>
                  <td className="part-type">{type}</td>
                  <td className="part-name">
                    {part ? (
                      <span className="selected-part">{part.name}</span>
                    ) : (
                      <span className="empty-part">No item selected</span>
                    )}
                  </td>
                  <td className="part-price">
                    {part ? formatCurrency(part.price) : "-"}
                  </td>
                  <td className="part-action">
                    <button className="action-btn">
                      {part ? "Edit" : "+ Choose"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
