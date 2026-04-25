const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/User');
const Election = require('./src/models/Election');
const Alert = require('./src/models/Alert');
const logger = require('./src/utils/logger');

const API_URL = 'http://localhost:5000/api';

const runSimulation = async () => {
  try {
    console.log('🚀 Starting Attack Simulation...');
    await mongoose.connect(process.env.MONGODB_URI);
    
    // 1. Find the target election
    const election = await Election.findOne({ status: 'active' }) || await Election.findOne({ title: 'University Council 2026' });
    if (!election) {
      console.error('❌ No active or demo election found. Please ensure seed data is loaded and an election is active.');
      process.exit(1);
    }
    const electionId = election._id;
    console.log(`Targeting Election: ${election.title} (${electionId})`);

    // 2. Setup demo users
    const users = [
      { email: 'john@example.com' },
      { email: 'jane@example.com' },
      { email: 'robert@example.com' }
    ];

    // Helper: Login and get token
    const login = async (email) => {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'password123' })
      });
      const data = await res.json();
      return data.token;
    };

    // Helper: Get voting token
    const getVotingToken = async (authToken) => {
      const res = await fetch(`${API_URL}/elections/${electionId}/token`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      return data.data?.token;
    };

    // --- ATTACK 1: DUPLICATE VOTE (Replay) ---
    console.log('\n--- Attempting Attack 1: Replay Attack (Using same token twice) ---');
    const token1 = await login(users[0].email);
    const votingToken = await getVotingToken(token1);
    
    const votePayload = {
      candidateId: election.candidates[0]._id,
      votingToken,
      fingerprint: 'attacker-fingerprint-999'
    };

    // First attempt (Success)
    console.log('First vote attempt...');
    const res1 = await fetch(`${API_URL}/elections/${electionId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token1}` },
      body: JSON.stringify(votePayload)
    });
    console.log(`Status: ${res1.status}`);

    // Second attempt (Fail)
    console.log('Second vote attempt (Replay)...');
    const res2 = await fetch(`${API_URL}/elections/${electionId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token1}` },
      body: JSON.stringify(votePayload)
    });
    const data2 = await res2.json();
    console.log(`Status: ${res2.status}, Message: ${data2.message}`);


    // --- ATTACK 2: SYBIL ATTEMPT (Same Fingerprint, Different Users) ---
    console.log('\n--- Attempting Attack 2: Sybil Attack (Same Device Fingerprint) ---');
    const token2 = await login(users[1].email);
    const votingToken2 = await getVotingToken(token2);
    
    console.log(`Casting vote for ${users[1].email} with SAME fingerprint...`);
    const res3 = await fetch(`${API_URL}/elections/${electionId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token2}` },
      body: JSON.stringify({
        candidateId: election.candidates[1]._id,
        votingToken: votingToken2,
        fingerprint: 'attacker-fingerprint-999' // CONFLICT!
      })
    });
    const data3 = await res3.json();
    console.log(`Status: ${res3.status}, Message: ${data3.message}`);


    // --- ATTACK 3: RATE LIMITING (Flood) ---
    console.log('\n--- Attempting Attack 3: Flood Attack (Rapid Requests) ---');
    console.log('Spamming health check to trigger rate limiter...');
    for (let i = 0; i < 20; i++) {
      fetch(`${API_URL}/health`);
    }
    console.log('Flood sent. Checking one more health check...');
    const resFlood = await fetch(`${API_URL}/health`);
    console.log(`Status: ${resFlood.status}`);

    // 4. Verify Alerts in DB
    console.log('\n--- Final Verification: Security Alerts Generated ---');
    const alerts = await Alert.find({}).sort({ createdAt: -1 }).limit(5);
    console.log(`Found ${alerts.length} recent alerts in system.`);
    alerts.forEach(a => console.log(`🚩 [${a.type}] ${a.message}`));

    console.log('\n✨ Simulation completed.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Simulation error:', err.message);
    process.exit(1);
  }
};

runSimulation();
