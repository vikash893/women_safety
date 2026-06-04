import React, { useState } from 'react';
import Navbar from '../Components/Navbar/Navbar';
import Footer from '../Components/Footer/Footer';
import { useSafety } from '../context/SafetyContext';
import { useAuth } from '../context/auth';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  FiHeart, FiPlus, FiTrash2, FiAlertOctagon, FiCheckCircle,
  FiUsers, FiUserPlus, FiShield, FiX
} from 'react-icons/fi';
import '../styles/AegisHer.css';

/**
 * AegisHer Profile & Safety Setup — with Trusted Circle System
 * Medical profile, emergency contacts, and full Trusted Circle CRUD management.
 */
export function AegisHerProfile() {
  const [auth] = useAuth();
  const {
    contacts, addContact, removeContact, user,
    circles, createCircle, deleteCircle, addCircleMember
  } = useSafety();

  // ─── Profile Form State ────────────────────────────────────────
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phoneNumber);
  const [bloodGroup, setBloodGroup] = useState(user.safetyProfile.bloodGroup);
  const [medicalNotes, setMedicalNotes] = useState(user.safetyProfile.medicalNotes);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

  // ─── Contact Form State ────────────────────────────────────────
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactPriority, setContactPriority] = useState(true);
  const [contactError, setContactError] = useState('');
  const [contactSuccess, setContactSuccess] = useState(false);

  // ─── Trusted Circle State ──────────────────────────────────────
  const [newCircleName, setNewCircleName] = useState('');
  const [addMemberEmail, setAddMemberEmail] = useState('');
  const [selectedCircleId, setSelectedCircleId] = useState(null);
  const [circleLoading, setCircleLoading] = useState(false);

  // ─── Active Tab ────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'circles'

  // ═══════════════════════════════════════════════════════════════
  //  HANDLERS
  // ═══════════════════════════════════════════════════════════════

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      await axios.post(
        "http://localhost:8000/api/v1/users/update-safety-profile",
        { userId: user.id, bloodGroup, medicalNotes },
        { headers: { Authorization: `Bearer ${auth?.token}` } }
      );
      setProfileSuccess(true);
      toast.success("Safety profile updated.");
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err) {
      toast.error("Failed to update safety profile.");
    } finally {
      setProfileSaving(false);
    }
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

  const handleCreateCircle = async () => {
    if (!newCircleName.trim()) {
      toast.error("Circle name is required.");
      return;
    }
    setCircleLoading(true);
    await createCircle(newCircleName.trim());
    setNewCircleName('');
    setCircleLoading(false);
  };

  const handleDeleteCircle = async (circleId) => {
    if (window.confirm("Are you sure you want to delete this trusted circle?")) {
      setCircleLoading(true);
      await deleteCircle(circleId);
      if (selectedCircleId === circleId) setSelectedCircleId(null);
      setCircleLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!addMemberEmail.trim()) {
      toast.error("Enter the member's email address.");
      return;
    }
    if (!selectedCircleId) {
      toast.error("Select a circle first.");
      return;
    }
    setCircleLoading(true);
    await addCircleMember(selectedCircleId, addMemberEmail.trim());
    setAddMemberEmail('');
    setCircleLoading(false);
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  const selectedCircle = circles.find(c => c._id === selectedCircleId);

  // Predefined circle type suggestions
  const circlePresets = ['Family', 'Friends', 'Hostel', 'Workplace', 'Neighborhood'];

  return (
    <div className="aegis-container">
      <Navbar />

      <div className="container py-5">
        {/* Title branding banner */}
        <div className="text-center mb-4 mt-4">
          <span className="text-uppercase tracking-wider fw-bold text-danger" style={{ fontSize: '12px', letterSpacing: '0.15em' }}>
            AegisHer Safety Config
          </span>
          <h1 className="fw-black text-light mt-1 mb-2" style={{ fontSize: '2.5rem' }}>
            Safety Profile & Trusted Circles
          </h1>
          <p className="text-muted max-w-lg mx-auto" style={{ fontSize: '15px' }}>
            Manage your medical records, emergency contacts, and trusted circle groups.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="d-flex justify-content-center gap-2 mb-5">
          <button
            onClick={() => setActiveTab('profile')}
            className={`btn ${activeTab === 'profile' ? 'aegis-btn-primary' : 'aegis-btn-outline'}`}
            style={{ fontSize: '13px', borderRadius: '10px' }}
          >
            <FiHeart size={14} className="me-2" />
            Medical Profile & Contacts
          </button>
          <button
            onClick={() => setActiveTab('circles')}
            className={`btn ${activeTab === 'circles' ? 'aegis-btn-primary' : 'aegis-btn-outline'}`}
            style={{ fontSize: '13px', borderRadius: '10px' }}
          >
            <FiUsers size={14} className="me-2" />
            Trusted Circles
            {circles.length > 0 && (
              <span className="badge bg-danger ms-2 rounded-pill" style={{ fontSize: '10px' }}>
                {circles.length}
              </span>
            )}
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/*  TAB 1: MEDICAL PROFILE + CONTACTS                          */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'profile' && (
          <div className="row g-4 align-items-start">
            {/* Left: Clinical Safety File */}
            <div className="col-12 col-lg-5">
              <div className="aegis-card p-4">
                <h3 className="fw-bold text-danger mb-4 d-flex align-items-center gap-2" style={{ fontSize: '18px' }}>
                  <FiHeart />
                  Medical Clinical Record
                </h3>

                <form onSubmit={handleProfileSave} className="d-flex flex-column gap-3">
                  <div className="d-flex flex-column gap-1">
                    <label className="text-muted uppercase fw-bold" style={{ fontSize: '10px', letterSpacing: '0.05em' }}>Your Full Name</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="aegis-input w-100" placeholder="Enter your name" />
                  </div>

                  <div className="d-flex flex-column gap-1">
                    <label className="text-muted uppercase fw-bold" style={{ fontSize: '10px', letterSpacing: '0.05em' }}>Your Emergency Mobile</label>
                    <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="aegis-input w-100" placeholder="e.g. +91 99999 88888" />
                  </div>

                  <div className="d-flex flex-column gap-1">
                    <label className="text-muted uppercase fw-bold" style={{ fontSize: '10px', letterSpacing: '0.05em' }}>Blood Index</label>
                    <select value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)} className="aegis-input w-100" style={{ backgroundColor: '#030712' }}>
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((grp) => (
                        <option key={grp} value={grp} style={{ backgroundColor: '#0f172a' }}>{grp}</option>
                      ))}
                    </select>
                  </div>

                  <div className="d-flex flex-column gap-1">
                    <label className="text-muted uppercase fw-bold" style={{ fontSize: '10px', letterSpacing: '0.05em' }}>Medical Notes & Warnings</label>
                    <textarea rows="3" value={medicalNotes} onChange={(e) => setMedicalNotes(e.target.value)} className="aegis-input w-100" style={{ resize: 'none' }} placeholder="Allergies, chronic conditions, prescriptions..." />
                  </div>

                  {profileSuccess && (
                    <div className="d-flex align-items-center gap-2 text-success p-3 rounded-3" style={{ backgroundColor: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', fontSize: '12px' }}>
                      <FiCheckCircle />
                      Clinical Safety Card updated and synced successfully!
                    </div>
                  )}

                  <button type="submit" className="aegis-btn-primary w-100 mt-2" disabled={profileSaving}>
                    {profileSaving ? 'Saving...' : 'Update Safety Card'}
                  </button>
                </form>
              </div>
            </div>

            {/* Right: Emergency Contacts */}
            <div className="col-12 col-lg-7 d-flex flex-column gap-4">
              {/* Add Contact */}
              <div className="aegis-card p-4">
                <h3 className="fw-bold text-danger mb-4 d-flex align-items-center gap-2" style={{ fontSize: '18px' }}>
                  <FiPlus />
                  Register New Emergency Node
                </h3>

                <form onSubmit={handleAddContact} className="row g-3">
                  <div className="col-12 col-md-6 d-flex flex-column gap-1">
                    <label className="text-muted uppercase fw-bold" style={{ fontSize: '10px', letterSpacing: '0.05em' }}>Contact Name</label>
                    <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} className="aegis-input w-100" placeholder="Brother, Mother, Partner..." />
                  </div>

                  <div className="col-12 col-md-6 d-flex flex-column gap-1">
                    <label className="text-muted uppercase fw-bold" style={{ fontSize: '10px', letterSpacing: '0.05em' }}>Mobile Number</label>
                    <input type="text" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="aegis-input w-100" placeholder="e.g. +91 99999 88888" />
                  </div>

                  <div className="col-12 border-top border-secondary pt-3 mt-3 d-flex align-items-center justify-content-between">
                    <div className="d-flex flex-column">
                      <span className="fw-semibold text-light" style={{ fontSize: '14px' }}>Priority Dispatch Node</span>
                      <span className="text-muted" style={{ fontSize: '11px' }}>Fires automated SMS coordinates to this target on SOS.</span>
                    </div>
                    <input type="checkbox" checked={contactPriority} onChange={(e) => setContactPriority(e.target.checked)} className="form-check-input bg-dark border-secondary" style={{ width: '1.2rem', height: '1.2rem', accentColor: '#f43f5e' }} />
                  </div>

                  {contactError && (
                    <div className="col-12 d-flex align-items-center gap-2 text-danger p-2 rounded-3" style={{ backgroundColor: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', fontSize: '12px' }}>
                      <FiAlertOctagon /> {contactError}
                    </div>
                  )}
                  {contactSuccess && (
                    <div className="col-12 d-flex align-items-center gap-2 text-success p-2 rounded-3" style={{ backgroundColor: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', fontSize: '12px' }}>
                      <FiCheckCircle /> Contact registered successfully!
                    </div>
                  )}

                  <div className="col-12">
                    <button type="submit" className="aegis-btn-secondary w-100 mt-1">Register Contact Node</button>
                  </div>
                </form>
              </div>

              {/* Contact List */}
              <div className="aegis-card p-4">
                <div className="d-flex justify-content-between align-items-center mb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
                  <h3 className="fw-bold text-light m-0" style={{ fontSize: '18px' }}>Safety Circle Directory</h3>
                  <span className="badge rounded-pill bg-dark text-muted border border-secondary px-3" style={{ fontSize: '11px' }}>
                    {contacts.length} Contacts
                  </span>
                </div>

                <div className="d-flex flex-column gap-2 aegis-scroll overflow-auto" style={{ maxHeight: '250px' }}>
                  {contacts.length === 0 ? (
                    <div className="text-center text-muted py-4" style={{ fontSize: '13px' }}>
                      No safety circle contacts registered. Please add nodes above!
                    </div>
                  ) : (
                    contacts.map((c) => (
                      <div key={c.contactId} className="d-flex align-items-center justify-content-between p-3 rounded-3" style={{ backgroundColor: 'rgba(3,7,18,0.4)', border: '1px solid rgba(255,255,255,0.03)' }}>
                        <div className="d-flex flex-column">
                          <div className="d-flex align-items-center gap-2">
                            <span className="fw-bold text-light" style={{ fontSize: '14px' }}>{c.name}</span>
                            {c.isPriority && (
                              <span className="text-uppercase fw-bold rounded-pill text-danger px-2 border" style={{ fontSize: '8px', letterSpacing: '0.05em', backgroundColor: 'rgba(244,63,94,0.05)', borderColor: 'rgba(244,63,94,0.2)' }}>
                                Priority
                              </span>
                            )}
                          </div>
                          <span className="text-muted" style={{ fontSize: '12px' }}>{c.phoneNumber}</span>
                        </div>
                        <button onClick={() => removeContact(c.contactId)} className="btn btn-link text-muted p-2" style={{ border: 'none' }} title="Remove Node">
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/*  TAB 2: TRUSTED CIRCLES MANAGEMENT                           */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'circles' && (
          <div className="row g-4">
            {/* Left: Create + Circle List */}
            <div className="col-12 col-lg-5 d-flex flex-column gap-4">
              {/* Create New Circle */}
              <div className="aegis-card p-4">
                <h3 className="fw-bold text-danger mb-3 d-flex align-items-center gap-2" style={{ fontSize: '18px' }}>
                  <FiPlus />
                  Create Trusted Circle
                </h3>
                <p className="text-muted mb-3" style={{ fontSize: '12px' }}>
                  Group your trusted contacts into organized circles. Each circle receives coordinated SOS broadcasts.
                </p>

                {/* Quick Presets */}
                <div className="d-flex flex-wrap gap-2 mb-3">
                  {circlePresets.map(preset => (
                    <button
                      key={preset}
                      onClick={() => setNewCircleName(preset)}
                      className="btn btn-sm"
                      style={{
                        fontSize: '11px',
                        fontWeight: '600',
                        backgroundColor: newCircleName === preset ? 'rgba(244,63,94,0.1)' : 'rgba(255,255,255,0.03)',
                        color: newCircleName === preset ? '#f43f5e' : '#94a3b8',
                        border: `1px solid ${newCircleName === preset ? 'rgba(244,63,94,0.3)' : 'rgba(255,255,255,0.06)'}`,
                        borderRadius: '8px',
                        padding: '4px 12px'
                      }}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <div className="d-flex gap-2">
                  <input
                    type="text"
                    value={newCircleName}
                    onChange={(e) => setNewCircleName(e.target.value)}
                    className="aegis-input flex-grow-1"
                    placeholder="Circle name (e.g. College Friends)"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateCircle()}
                  />
                  <button
                    onClick={handleCreateCircle}
                    disabled={circleLoading || !newCircleName.trim()}
                    className="aegis-btn-primary d-flex align-items-center gap-2"
                    style={{ fontSize: '13px', whiteSpace: 'nowrap' }}
                  >
                    <FiPlus size={16} />
                    {circleLoading ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </div>

              {/* Circle List */}
              <div className="aegis-card p-4">
                <div className="d-flex justify-content-between align-items-center mb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
                  <h3 className="fw-bold text-light m-0" style={{ fontSize: '18px' }}>Your Circles</h3>
                  <span className="badge rounded-pill bg-dark text-muted border border-secondary px-3" style={{ fontSize: '11px' }}>
                    {circles.length} Circles
                  </span>
                </div>

                <div className="d-flex flex-column gap-2 aegis-scroll overflow-auto" style={{ maxHeight: '400px' }}>
                  {circles.length === 0 ? (
                    <div className="text-center text-muted py-5" style={{ fontSize: '13px' }}>
                      <FiUsers size={32} className="mb-3 d-block mx-auto" style={{ opacity: 0.3 }} />
                      No trusted circles created yet. Use the form above to create your first circle.
                    </div>
                  ) : (
                    circles.map((circle) => (
                      <div
                        key={circle._id}
                        onClick={() => setSelectedCircleId(circle._id)}
                        className="d-flex align-items-center justify-content-between p-3 rounded-3"
                        style={{
                          backgroundColor: selectedCircleId === circle._id ? 'rgba(244,63,94,0.06)' : 'rgba(3,7,18,0.4)',
                          border: `1px solid ${selectedCircleId === circle._id ? 'rgba(244,63,94,0.2)' : 'rgba(255,255,255,0.03)'}`,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div className="d-flex align-items-center gap-3">
                          <div className="aegis-circle-avatar">
                            <FiShield size={16} />
                          </div>
                          <div>
                            <span className="fw-bold text-light d-block" style={{ fontSize: '14px' }}>
                              {circle.name}
                            </span>
                            <span className="text-muted" style={{ fontSize: '11px' }}>
                              {circle.members?.length || 0} member{(circle.members?.length || 0) !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>

                        <div className="d-flex align-items-center gap-2">
                          {selectedCircleId === circle._id && (
                            <span className="badge rounded-pill" style={{ fontSize: '9px', backgroundColor: 'rgba(244,63,94,0.1)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.2)' }}>
                              Selected
                            </span>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteCircle(circle._id); }}
                            className="btn btn-link text-muted p-1"
                            style={{ border: 'none', fontSize: '14px' }}
                            title="Delete circle"
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right: Circle Detail + Add Member */}
            <div className="col-12 col-lg-7">
              {!selectedCircle ? (
                <div className="aegis-card p-5 text-center" style={{ minHeight: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: '72px', height: '72px', borderRadius: '50%', backgroundColor: 'rgba(100,116,139,0.06)', border: '1px solid rgba(100,116,139,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                    <FiUsers size={28} color="#64748b" />
                  </div>
                  <h4 className="fw-bold text-light mb-2" style={{ fontSize: '18px' }}>Select a Circle</h4>
                  <p className="text-muted" style={{ fontSize: '13px', maxWidth: '300px' }}>
                    Choose a trusted circle from the left panel to view its members and add new people.
                  </p>
                </div>
              ) : (
                <div className="d-flex flex-column gap-4">
                  {/* Circle Header */}
                  <div className="aegis-card-glow p-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <div className="d-flex align-items-center gap-3">
                        <div className="aegis-circle-avatar" style={{ width: '48px', height: '48px', fontSize: '18px' }}>
                          <FiShield size={22} />
                        </div>
                        <div>
                          <h3 className="fw-bold text-light m-0" style={{ fontSize: '20px' }}>{selectedCircle.name}</h3>
                          <span className="text-muted" style={{ fontSize: '12px' }}>
                            {selectedCircle.members?.length || 0} registered member{(selectedCircle.members?.length || 0) !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedCircleId(null)}
                        className="btn btn-link text-muted p-2"
                        title="Close"
                      >
                        <FiX size={18} />
                      </button>
                    </div>

                    {/* Add Member Form */}
                    <div className="d-flex gap-2 mt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
                      <div style={{ position: 'relative', flex: 1 }}>
                        <FiUserPlus size={14} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                        <input
                          type="email"
                          value={addMemberEmail}
                          onChange={(e) => setAddMemberEmail(e.target.value)}
                          className="aegis-input w-100"
                          style={{ paddingLeft: '38px' }}
                          placeholder="Enter member's email address"
                          onKeyDown={(e) => e.key === 'Enter' && handleAddMember()}
                        />
                      </div>
                      <button
                        onClick={handleAddMember}
                        disabled={circleLoading || !addMemberEmail.trim()}
                        className="aegis-btn-primary d-flex align-items-center gap-2"
                        style={{ fontSize: '13px', whiteSpace: 'nowrap' }}
                      >
                        <FiUserPlus size={14} />
                        {circleLoading ? 'Adding...' : 'Add Member'}
                      </button>
                    </div>
                  </div>

                  {/* Members List */}
                  <div className="aegis-card p-4">
                    <h4 className="fw-bold text-light mb-3 d-flex align-items-center gap-2" style={{ fontSize: '16px' }}>
                      <FiUsers size={16} />
                      Circle Members
                    </h4>

                    <div className="d-flex flex-column gap-2 aegis-scroll overflow-auto" style={{ maxHeight: '350px' }}>
                      {(!selectedCircle.members || selectedCircle.members.length === 0) ? (
                        <div className="text-center text-muted py-4" style={{ fontSize: '13px' }}>
                          This circle has no members yet. Add members using their email address above.
                        </div>
                      ) : (
                        selectedCircle.members.map((member, idx) => {
                          const memberName = typeof member === 'object' ? (member.uname || member.name || 'Member') : 'Member';
                          const memberEmail = typeof member === 'object' ? (member.email || '') : '';
                          const memberPhone = typeof member === 'object' ? (member.phoneNo || '') : '';

                          return (
                            <div
                              key={member._id || idx}
                              className="d-flex align-items-center justify-content-between p-3 rounded-3"
                              style={{ backgroundColor: 'rgba(3,7,18,0.4)', border: '1px solid rgba(255,255,255,0.03)' }}
                            >
                              <div className="d-flex align-items-center gap-3">
                                <div className="aegis-circle-avatar">
                                  {getInitials(memberName)}
                                </div>
                                <div>
                                  <span className="fw-bold text-light d-block" style={{ fontSize: '14px' }}>
                                    {memberName}
                                  </span>
                                  <span className="text-muted" style={{ fontSize: '11px' }}>
                                    {memberEmail || memberPhone || 'Registered user'}
                                  </span>
                                </div>
                              </div>
                              <div className="d-flex align-items-center gap-2">
                                {idx === 0 && (
                                  <span className="badge rounded-pill" style={{ fontSize: '9px', backgroundColor: 'rgba(16,185,129,0.08)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
                                    Owner
                                  </span>
                                )}
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 6px rgba(16,185,129,0.4)' }}></span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}

export default AegisHerProfile;
