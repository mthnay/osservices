const express = require('express');
const router = express.Router();
const Role = require('../models/Role');
const { protect } = require('../middleware/authMiddleware');

// Seed default roles if none exist
const seedDefaultRoles = async () => {
    try {
        const count = await Role.countDocuments();
        if (count === 0) {
            const defaultRoles = [
                { name: 'SuperAdmin', displayName: 'Super Admin', permissions: ['view_all_stores', 'manage_users', 'manage_settings', 'manage_stock'], isSystem: true },
                { name: 'StoreManager', displayName: 'Mağaza Müdürü', permissions: ['manage_stock', 'delete_repair'], isSystem: true },
                { name: 'servis_sorumlusu', displayName: 'Servis Sorumlusu', permissions: ['manage_stock', 'delete_repair'], isSystem: true },
                { name: 'Reception', displayName: 'Resepsiyon', permissions: ['manage_stock'], isSystem: true },
                { name: 'Technician', displayName: 'Teknisyen', permissions: [], isSystem: true },
                { name: 'Accountant', displayName: 'Muhasebe', permissions: ['view_all_stores'], isSystem: true },
            ];
            await Role.insertMany(defaultRoles);
            console.log('Default roles seeded successfully');
        } else {
            // Ensure servis_sorumlusu exists even if roles were already seeded
            const exist = await Role.findOne({ name: 'servis_sorumlusu' });
            if (!exist) {
                await Role.create({
                    name: 'servis_sorumlusu',
                    displayName: 'Servis Sorumlusu',
                    permissions: ['manage_stock', 'delete_repair'],
                    isSystem: true
                });
                console.log('Seeded servis_sorumlusu role');
            }
        }
    } catch (error) {
        console.error('Error seeding roles:', error);
    }
};
seedDefaultRoles();

// Get all roles
router.get('/', protect, async (req, res) => {
    try {
        const roles = await Role.find({});
        res.json(roles);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create new role
router.post('/', protect, async (req, res) => {
    try {
        const { name, displayName, permissions } = req.body;
        
        // Prevent creating existing role name
        const roleExists = await Role.findOne({ name });
        if (roleExists) {
            return res.status(400).json({ message: 'Bu rol adı zaten mevcut' });
        }

        const role = await Role.create({
            name,
            displayName,
            permissions: permissions || [],
            isSystem: false
        });

        res.status(201).json(role);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update role
router.put('/:id', protect, async (req, res) => {
    try {
        const { displayName, permissions } = req.body;
        const role = await Role.findById(req.params.id);

        if (!role) {
            return res.status(404).json({ message: 'Rol bulunamadı' });
        }

        role.displayName = displayName || role.displayName;
        role.permissions = permissions || role.permissions;

        const updatedRole = await role.save();
        res.json(updatedRole);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete role
router.delete('/:id', protect, async (req, res) => {
    try {
        const role = await Role.findById(req.params.id);

        if (!role) {
            return res.status(404).json({ message: 'Rol bulunamadı' });
        }

        if (role.isSystem) {
            return res.status(400).json({ message: 'Sistem rolleri silinemez' });
        }

        await role.deleteOne();
        res.json({ message: 'Rol başarıyla silindi' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
