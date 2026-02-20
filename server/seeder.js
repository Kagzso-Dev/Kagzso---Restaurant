/**
 * Multi-Tenant Seeder
 * Creates:
 *   1. SuperAdmin user (no tenantId/branchId)
 *   2. Demo Tenant: "Hotel Sunshine"
 *   3. Two Branches: Main Branch, Airport Branch
 *   4. Staff users for each branch
 *   5. Categories, MenuItems, Tables per branch
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

const connectDB = require('./config/db');
const Tenant = require('./models/Tenant');
const Branch = require('./models/Branch');
const User = require('./models/User');
const Table = require('./models/Table');
const MenuItem = require('./models/MenuItem');
const Category = require('./models/Category');
const Setting = require('./models/Setting');
const Counter = require('./models/Counter');

dotenv.config();

const hash = async (pw) => bcrypt.hash(pw, await bcrypt.genSalt(10));

const importData = async () => {
    try {
        await connectDB();
        console.log('🗑  Clearing existing data...');
        await Promise.all([
            User.deleteMany(),
            Tenant.deleteMany(),
            Branch.deleteMany(),
            Table.deleteMany(),
            MenuItem.deleteMany(),
            Category.deleteMany(),
            Setting.deleteMany(),
            Counter.deleteMany(),
        ]);

        // Drop stale indexes so Mongoose can recreate them with new compound keys.
        // This handles the migration from old single-field unique indexes.
        console.log('🔧 Dropping stale indexes...');
        const dropIndex = async (model, indexName) => {
            try {
                await model.collection.dropIndex(indexName);
                console.log(`   Dropped: ${model.modelName}.${indexName}`);
            } catch (e) {
                // Index may not exist — that's fine
            }
        };
        await dropIndex(User, 'username_1');
        await dropIndex(Table, 'number_1');
        await dropIndex(Category, 'name_1');
        await dropIndex(MenuItem, 'name_1');
        await dropIndex(Setting, 'tenantId_1_branchId_1');

        // ── 1. SuperAdmin ─────────────────────────────────────────────────────
        console.log('👑 Creating SuperAdmin...');
        await User.create({
            username: 'superadmin',
            password: 'super123', // Pre-save hook will hash this
            role: 'superadmin',
            // No tenantId / branchId for superadmin
        });

        // ── 2. Tenant ─────────────────────────────────────────────────────────
        console.log('🏨 Creating Tenant...');
        const tenant = await Tenant.create({
            name: 'Hotel Sunshine',
            subdomain: 'sunshine',
            subscriptionPlan: 'pro',
            maxBranches: 5,
        });

        // ── 3. Branches ───────────────────────────────────────────────────────
        console.log('🏢 Creating Branches...');
        const mainBranch = await Branch.create({
            name: 'Main Branch',
            tenantId: tenant._id,
            address: { street: '12 MG Road', city: 'Bangalore', state: 'Karnataka', pincode: '560001' },
            phone: '080-12345678',
        });

        const airportBranch = await Branch.create({
            name: 'Airport Branch',
            tenantId: tenant._id,
            address: { street: 'Terminal 2, KIAL', city: 'Bangalore', state: 'Karnataka', pincode: '560300' },
            phone: '080-87654321',
        });

        // ── 4. Staff Users for Main Branch ────────────────────────────────────
        console.log('👥 Creating staff for Main Branch...');
        await User.insertMany([
            { username: 'admin', password: await hash('admin123'), role: 'admin', tenantId: tenant._id, branchId: mainBranch._id },
            { username: 'waiter', password: await hash('waiter123'), role: 'waiter', tenantId: tenant._id, branchId: mainBranch._id },
            { username: 'kitchen', password: await hash('cook123'), role: 'kitchen', tenantId: tenant._id, branchId: mainBranch._id },
            { username: 'cashier', password: await hash('pay123'), role: 'cashier', tenantId: tenant._id, branchId: mainBranch._id },
        ]);

        // ── 5. Staff Users for Airport Branch ────────────────────────────────
        console.log('👥 Creating staff for Airport Branch...');
        await User.insertMany([
            { username: 'admin2', password: await hash('admin123'), role: 'admin', tenantId: tenant._id, branchId: airportBranch._id },
            { username: 'waiter2', password: await hash('waiter123'), role: 'waiter', tenantId: tenant._id, branchId: airportBranch._id },
            { username: 'kitchen2', password: await hash('cook123'), role: 'kitchen', tenantId: tenant._id, branchId: airportBranch._id },
            { username: 'cashier2', password: await hash('pay123'), role: 'cashier', tenantId: tenant._id, branchId: airportBranch._id },
        ]);

        // ── 6. Settings per branch ────────────────────────────────────────────
        console.log('⚙️  Creating branch settings...');
        await Setting.insertMany([
            {
                restaurantName: 'Hotel Sunshine - Main',
                currency: 'INR', currencySymbol: '₹', taxRate: 5, gstNumber: 'GST123456',
                tenantId: tenant._id, branchId: mainBranch._id,
            },
            {
                restaurantName: 'Hotel Sunshine - Airport',
                currency: 'INR', currencySymbol: '₹', taxRate: 5, gstNumber: 'GST123456',
                tenantId: tenant._id, branchId: airportBranch._id,
            },
        ]);

        // ── 7. Categories + Menu for Main Branch ──────────────────────────────
        console.log('🍽  Creating menu for Main Branch...');
        const mainCats = await Category.insertMany([
            { name: 'Starters', description: 'Appetizers', tenantId: tenant._id, branchId: mainBranch._id },
            { name: 'Main Course', description: 'Heavy meals', tenantId: tenant._id, branchId: mainBranch._id },
            { name: 'Beverages', description: 'Drinks', tenantId: tenant._id, branchId: mainBranch._id },
        ]);

        await MenuItem.insertMany([
            { name: 'Paneer Tikka', price: 250, category: mainCats[0]._id, isVeg: true, tenantId: tenant._id, branchId: mainBranch._id },
            { name: 'Chicken Wings', price: 300, category: mainCats[0]._id, isVeg: false, tenantId: tenant._id, branchId: mainBranch._id },
            { name: 'Butter Chicken', price: 400, category: mainCats[1]._id, isVeg: false, tenantId: tenant._id, branchId: mainBranch._id },
            { name: 'Dal Makhani', price: 200, category: mainCats[1]._id, isVeg: true, tenantId: tenant._id, branchId: mainBranch._id },
            { name: 'Coke', price: 50, category: mainCats[2]._id, isVeg: true, tenantId: tenant._id, branchId: mainBranch._id },
        ]);

        // ── 8. Categories + Menu for Airport Branch ───────────────────────────
        console.log('🍽  Creating menu for Airport Branch...');
        const airCats = await Category.insertMany([
            { name: 'Snacks', description: 'Quick bites', tenantId: tenant._id, branchId: airportBranch._id },
            { name: 'Beverages', description: 'Drinks', tenantId: tenant._id, branchId: airportBranch._id },
        ]);

        await MenuItem.insertMany([
            { name: 'Veg Sandwich', price: 120, category: airCats[0]._id, isVeg: true, tenantId: tenant._id, branchId: airportBranch._id },
            { name: 'Coffee', price: 80, category: airCats[1]._id, isVeg: true, tenantId: tenant._id, branchId: airportBranch._id },
        ]);

        // ── 9. Tables per branch ──────────────────────────────────────────────
        console.log('🪑 Creating tables...');
        const mainTables = Array.from({ length: 10 }, (_, i) => ({
            number: i + 1, capacity: 4,
            tenantId: tenant._id, branchId: mainBranch._id,
        }));
        const airTables = Array.from({ length: 5 }, (_, i) => ({
            number: i + 1, capacity: 2,
            tenantId: tenant._id, branchId: airportBranch._id,
        }));

        await Table.insertMany([...mainTables, ...airTables]);

        console.log('\n✅ Seed complete!\n');
        console.log('═══════════════════════════════════════════');
        console.log('  SUPERADMIN  → superadmin / super123');
        console.log('─────────────────────────────────────────');
        console.log('  MAIN BRANCH STAFF:');
        console.log('  Admin   → admin   / admin123');
        console.log('  Waiter  → waiter  / waiter123');
        console.log('  Kitchen → kitchen / cook123');
        console.log('  Cashier → cashier / pay123');
        console.log('─────────────────────────────────────────');
        console.log('  AIRPORT BRANCH STAFF:');
        console.log('  Admin   → admin2   / admin123');
        console.log('  Waiter  → waiter2  / waiter123');
        console.log('  Kitchen → kitchen2 / cook123');
        console.log('  Cashier → cashier2 / pay123');
        console.log('═══════════════════════════════════════════\n');

        process.exit();
    } catch (error) {
        console.error('❌ Seed error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
};

importData();
