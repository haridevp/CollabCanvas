const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });
const User = require('./models/User');

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  const users = await User.find({}).limit(10).sort({ createdAt: -1 });
  console.log(users.map(u => ({ username: u.username, email: u.email, googleId: u.googleId, hasId: !!u._id })));
  await mongoose.disconnect();
}
test().catch(console.error);
