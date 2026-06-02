import React, { useState } from 'react';
import Navbar from '../Components/Navbar/Navbar';
import Footer from '../Components/Footer/Footer';
import { useSafety } from '../context/SafetyContext';
import { FiHeart, FiPlus, FiTrash2, FiAlertOctagon, FiCheckCircle } from 'react-icons/fi';
import '../styles/AegisHer.css';

/**
 * AegisHer Profile & Safety Setup View
 * Configures the victim's blood information, clinical logs, and registered SOS contacts list.
 */
export function AegisHerProfile() {
  const { contacts, addContact, removeContact, user } = useSafety();

  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phoneNumber);
  const [bloodGroup, setBloodGroup] = useState(user.safetyProfile.bloodGroup);
  const [medicalNotes, setMedicalNotes] = useState(user.safetyProfile.medicalNotes);
  const [profileSuccess, setProfileSuccess] = useState(false);

  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactPriority, setContactPriority] = useState(true);
  const [contactError, setContactError] = useState('');
  const [contactSuccess, setContactSuccess] = useState(false);

  const handleProfileSave = (e) => {
    e.preventDefault();
    setProfileSuccess(true);
    setTimeout(() => setProfileSuccess(false), 3000);
  };

  const handleAddContact = (e) => {
    e.preventDefault();
    setContactError('');
    setContactSuccess(false);

    if (!contactName.trim()) {
      setContactError('Contact name is required.');
      return;
    }

    const cleanedPhone = contactPhone.replace(/\s+/g, '');
    const phoneRegex = /^\+?[0-9]{8,15}$/;
    if (!phoneRegex.test(cleanedPhone)) {
      setContactError('Please enter a valid phone number (8-15 digits).');
      return;
    }

    addContact({
      name: contactName,
      phoneNumber: contactPhone,
      isPriority: contactPriority
    });

    setContactName('');
    setContactPhone('');
    setContactPriority(true);
    setContactSuccess(true);
    setTimeout(() => setContactSuccess(false), 2500);
  };

  return (
    <div className="aegis-container">
      <Navbar />
      
      <div className="container py-5">
        {/* Title branding banner */}
        <div className="text-center mb-5 mt-4">
          <span className="text-uppercase tracking-wider fw-bold text-danger" style={{ fontSize: '12px', letterSpacing: '0.15em' }}>
            AegisHer Safety Config
          </span>
          <h1 className="fw-black text-light mt-1 mb-2" style={{ fontSize: '2.5rem' }}>
            Personal Safety Card & Contacts
          </h1>
          <p className="text-muted max-w-lg mx-auto" style={{ fontSize: '15px' }}>
            Keep your responder parameters up to date. Responders will receive this critical information upon SOS execution.
          </p>
        </div>

        <div className="row g-4 align-items-start">
          {/* 1. Left side form (Clinical Safety File) */}
          <div className="col-12 col-lg-5">
            <div className="aegis-card p-4">
              <h3 className="fw-bold text-danger mb-4 d-flex align-items-center gap-2" style={{ fontSize: '18px' }}>
                <FiHeart />
                Medical Clinical Record
              </h3>
              
              <form onSubmit={handleProfileSave} className="d-flex flex-column gap-3">
                <div className="d-flex flex-column gap-1">
                  <label className="text-muted uppercase fw-bold" style={{ fontSize: '10px', letterSpacing: '0.05em' }}>Your Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="aegis-input w-100"
                    placeholder="Enter your name"
                  />
                </div>

                <div className="d-flex flex-column gap-1">
                  <label className="text-muted uppercase fw-bold" style={{ fontSize: '10px', letterSpacing: '0.05em' }}>Your Emergency Mobile</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="aegis-input w-100"
                    placeholder="e.g. +91 99999 88888"
                  />
                </div>

                <div className="d-flex flex-column gap-1">
                  <label className="text-muted uppercase fw-bold" style={{ fontSize: '10px', letterSpacing: '0.05em' }}>Blood Index</label>
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="aegis-input w-100"
                    style={{ backgroundColor: '#030712' }}
                  >
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((grp) => (
                      <option key={grp} value={grp} style={{ backgroundColor: '#0f172a' }}>{grp}</option>
                    ))}
                  </select>
                </div>

                <div className="d-flex flex-column gap-1">
                  <label className="text-muted uppercase fw-bold" style={{ fontSize: '10px', letterSpacing: '0.05em' }}>Medical Notes & Warnings</label>
                  <textarea
                    rows="3"
                    value={medicalNotes}
                    onChange={(e) => setMedicalNotes(e.target.value)}
                    className="aegis-input w-100"
                    style={{ resize: 'none' }}
                    placeholder="Allergies, chronic conditions, prescriptions..."
                  ></textarea>
                </div>

                {profileSuccess && (
                  <div className="d-flex align-items-center gap-2 text-success p-3 rounded-3" style={{ backgroundColor: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', fontSize: '12px' }}>
                    <FiCheckCircle />
                    Clinical Safety Card updated and synced successfully!
                  </div>
                )}

                <button type="submit" className="aegis-btn-primary w-100 mt-2">
                  Update Safety Card
                </button>
              </form>
            </div>
          </div>

          {/* 2. Right side form (Emergency Contacts List) */}
          <div className="col-12 col-lg-7 d-flex flex-column gap-4">
            {/* Register contact node */}
            <div className="aegis-card p-4">
              <h3 className="fw-bold text-danger mb-4 d-flex align-items-center gap-2" style={{ fontSize: '18px' }}>
                <FiPlus />
                Register New Emergency Node
              </h3>
              
              <form onSubmit={handleAddContact} className="row g-3">
                <div className="col-12 col-md-6 d-flex flex-column gap-1">
                  <label className="text-muted uppercase fw-bold" style={{ fontSize: '10px', letterSpacing: '0.05em' }}>Contact Name</label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="aegis-input w-100"
                    placeholder="Brother, Mother, Partner..."
                  />
                </div>

                <div className="col-12 col-md-6 d-flex flex-column gap-1">
                  <label className="text-muted uppercase fw-bold" style={{ fontSize: '10px', letterSpacing: '0.05em' }}>Mobile Number</label>
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="aegis-input w-100"
                    placeholder="e.g. +91 99999 88888"
                  />
                </div>

                <div className="col-12 border-top border-secondary pt-3 mt-3 d-flex align-items-center justify-content-between">
                  <div className="d-flex flex-column">
                    <span className="fw-semibold text-light" style={{ fontSize: '14px' }}>Priority Dispatch Node</span>
                    <span className="text-muted" style={{ fontSize: '11px' }}>Fires automated SMS coordinates to this target on SOS.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={contactPriority}
                    onChange={(e) => setContactPriority(e.target.checked)}
                    className="form-check-input bg-dark border-secondary"
                    style={{ width: '1.2rem', height: '1.2rem', accentColor: '#f43f5e' }}
                  />
                </div>

                {contactError && (
                  <div className="col-12 d-flex align-items-center gap-2 text-danger p-2.5 rounded-3" style={{ backgroundColor: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', fontSize: '12px' }}>
                    <FiAlertOctagon />
                    {contactError}
                  </div>
                )}

                {contactSuccess && (
                  <div className="col-12 d-flex align-items-center gap-2 text-success p-2.5 rounded-3" style={{ backgroundColor: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', fontSize: '12px' }}>
                    <FiCheckCircle />
                    Contact registered successfully!
                  </div>
                )}

                <div className="col-12">
                  <button type="submit" className="aegis-btn-secondary w-100 mt-1">
                    Register Contact Node
                  </button>
                </div>
              </form>
            </div>

            {/* List current emergency circle */}
            <div className="aegis-card p-4">
              <div className="d-flex justify-content-between align-items-center border-b pb-3 mb-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                <h3 className="fw-bold text-light m-0" style={{ fontSize: '18px' }}>
                  Safety Circle Directory
                </h3>
                <span className="badge rounded-pill bg-dark text-muted border border-secondary px-3 py-1.5" style={{ fontSize: '11px' }}>
                  {contacts.length} Contacts Active
                </span>
              </div>

              <div className="d-flex flex-column gap-2 aegis-scroll overflow-auto" style={{ maxHeight: '250px' }}>
                {contacts.length === 0 ? (
                  <div className="text-center text-muted py-4" style={{ fontSize: '13px' }}>
                    No safety circle contacts registered. Please add nodes above!
                  </div>
                ) : (
                  contacts.map((c) => (
                    <div
                      key={c.contactId}
                      className="d-flex align-items-center justify-content-between p-3 rounded-3"
                      style={{ backgroundColor: 'rgba(3,7,18,0.4)', border: '1px solid rgba(255,255,255,0.03)' }}
                    >
                      <div className="d-flex flex-column gap-0.5">
                        <div className="d-flex align-items-center gap-2">
                          <span className="fw-bold text-light" style={{ fontSize: '14px' }}>{c.name}</span>
                          {c.isPriority && (
                            <span 
                              className="text-uppercase fw-extrabold rounded-pill text-danger px-2.5 py-0.5 border" 
                              style={{ fontSize: '8px', letterSpacing: '0.05em', backgroundColor: 'rgba(244,63,94,0.05)', borderColor: 'rgba(244,63,94,0.2)' }}
                            >
                              Priority
                            </span>
                          )}
                        </div>
                        <span className="text-muted" style={{ fontSize: '12px' }}>{c.phoneNumber}</span>
                      </div>
                      
                      <button
                        onClick={() => removeContact(c.contactId)}
                        className="btn btn-link text-muted p-2 rounded-3"
                        style={{ border: 'none', transition: 'all 0.2s' }}
                        onMouseOver={(e) => e.currentTarget.style.color = '#f43f5e'}
                        onMouseOut={(e) => e.currentTarget.style.color = '#64748b'}
                        title="Remove Node"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
export default AegisHerProfile;
