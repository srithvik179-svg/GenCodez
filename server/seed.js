const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/User');
const Election = require('./src/models/Election');
const logger = require('./src/utils/logger');

const demoVoters = [
  { name: 'John Doe', email: 'john@example.com', password: 'password123', role: 'voter' },
  { name: 'Jane Smith', email: 'jane@example.com', password: 'password123', role: 'voter' },
  { name: 'Robert Brown', email: 'robert@example.com', password: 'password123', role: 'voter' },
  { name: 'Emily White', email: 'emily@example.com', password: 'password123', role: 'voter' },
  { name: 'Michael Green', email: 'michael@example.com', password: 'password123', role: 'voter' }
];

const demoElections = [
  {
    title: 'University Council 2026',
    description: 'General election for the university student council representatives.',
    status: 'pending',
    startDate: new Date(Date.now() + 86400000), // tomorrow
    endDate: new Date(Date.now() + 86400000 * 3), // +3 days
    candidates: [
      { name: 'Alice Walker', party: 'Visionary League' },
      { name: 'Bob Richards', party: 'Progressive Alliance' },
      { name: 'Charlie Day', party: 'Independent' }
    ]
  },
  {
    title: 'Employee of the Year',
    description: 'Internal corporate recognition program.',
    status: 'completed',
    startDate: new Date(Date.now() - 86400000 * 10), // 10 days ago
    endDate: new Date(Date.now() - 86400000 * 7), // 7 days ago
    candidates: [
      { name: 'Sarah Connor', party: 'Tech Ops' },
      { name: 'Kyle Reese', party: 'Human Resources' }
    ],
    totalVotes: 145
  }
];

const seed = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB.');

    // 1. Ensure Admin exists
    const adminEmail = 'admin@trustvote.com';
    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      admin = await User.create({
        name: 'System Admin',
        email: adminEmail,
        password: 'admin123',
        role: 'admin'
      });
      console.log('✅ Admin account created: admin@trustvote.com / admin123');
    } else {
      admin.role = 'admin';
      await admin.save();
      console.log('✅ Admin account verified.');
    }

    // 2. Create Demo Voters
    console.log('Creating demo voters...');
    for (const vData of demoVoters) {
      const exists = await User.findOne({ email: vData.email });
      if (!exists) {
        await User.create(vData);
        console.log(`   - Created ${vData.name}`);
      }
    }

    // 3. Create Demo Elections
    console.log('Creating demo elections...');
    for (const eData of demoElections) {
      const exists = await Election.findOne({ title: eData.title });
      if (!exists) {
        await Election.create({ ...eData, createdBy: admin._id });
        console.log(`   - Created election: ${eData.title}`);
      }
    }

    console.log('\n✨ Seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  }
};

seed();
