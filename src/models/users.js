const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcrypt = require('bcrypt');
const paginate = require("./plugin/paginate");
const dateRange = require('./plugin/dateRange');
const {GetPresignedUrl} = require("../utils/s3Store");

const users = new Schema({
    firstname: {
        type: String,
    },
    lastname: {
        type: String
    },
    username: {
        type: String,
        required: true,
        unique: 1,
        validate: {
            validator: function (value) {
                return value.trim().length > 0;
            },
            message: 'Username cannot be blank',
        },
    },
    password: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: false
    },
    country: {
        type: String,
        required: false
    },
    // verificationCode: {
    //     type: Number,
    //     required: true,
    // },
    emailVerified: {
        type: Boolean,
        required: true,
        default: false,
    },
    profilePicture: {
        type: String,
        required: true,
        default: 'https://cdn.sforum.vn/sforum/wp-content/uploads/2023/10/avatar-trang-4.jpg'
    },
    role: {
        type: String,
        required: true,
        enum: ['user', 'admin'],
        default: 'user'
    },
    servicePack: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ServicePacks',
        required: false,
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    isBanned: {
        type: Boolean,
        required: true,
        default: false,
    },
    isDeleted: {
        type: Boolean,
        required: true,
        default: false,
    }
});
users.pre('findOne', async function (docs, next) {
    this.populate({
        path: "servicePack"
    })
});
users.plugin(paginate);
users.post('findOne', async function (doc, next) {
    if (doc && doc.profilePicture) doc.profilePicture = await GetPresignedUrl(doc.profilePicture);
    next()
});
users.post('find', async function (docs, next) {
    for (let doc of docs) {
        if (doc && doc.profilePicture) doc.profilePicture = await GetPresignedUrl(doc.profilePicture);
    }
    next()
});
users.pre('save', async function (next) {

    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@#$%^&+=!])(?!.*\s).{8,}$/;

    const emailRegex = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

    const user = await this.constructor.findOne({username: this.username});

    if (user) throw new Error('A user is already registered with this username');

    if (this.email && !emailRegex.test(this.email)) throw new Error('Email must follow condition')

    if (!passwordRegex.test(this.password)) throw new Error('password must follow condition')

    //just hash password when modified password (change password, create new user)
    if (!this.isModified('password')) {
        return next();
    }
    try {
        // Generate a salt and hash the password
        const saltRounds = 10;
        this.password = await bcrypt.hash(this.password, saltRounds);
        next();
    } catch (error) {
        next(error);
    }
});

users.pre('findOneAndUpdate', async function (next) {

    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@#$%^&+=!])(?!.*\s).{8,}$/;

    const emailRegex = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

    if (this._update.email && !emailRegex.test(this._update.email)) throw new Error('Email must follow condition')

    if (this._update.password) {
        if (!passwordRegex.test(this._update.password)) throw new Error('password must follow condition')
        try {
            // Generate a salt and hash the password
            const saltRounds = 10;
            this._update.password = await bcrypt.hash(this._update.password, saltRounds);
            next();
        } catch (error) {
            next(error);
        }
    }

    // //just hash password when modified password (change password, create new user)
    // if (!this.isModified('password')) {
    //     return next();
    // }
    
});


module.exports = mongoose.model('Users', users);