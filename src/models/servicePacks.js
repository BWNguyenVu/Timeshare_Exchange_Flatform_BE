const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const servicePackSchema = new Schema({
    amount: {
        type: Number,
        required: true
    },
    role: {
        type: String,
        enum: ['member-basic', 'member-protected', 'member-fullservice'],
        required: true
    },
    numberPosts: {
        type: Number,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    name: {
        type: String,
        required: true
    }
});

const ServicePack = mongoose.model('ServicePacks', servicePackSchema);
module.exports = ServicePack;
