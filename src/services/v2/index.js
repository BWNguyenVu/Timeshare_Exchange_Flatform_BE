const authServices = require('./auth.service');
const userServices = require('./user.service');
const timeshareServices = require('./timeshare.service');
const resortServices = require('./resort.service')
const requestServices = require('./request.service');
const reservationServices = require('./reservation.service');
const unitServices = require('./unit.service');
const tripServices = require('./trip.service')
const paymentServices = require('./payment.service')
const servicePackServices = require('./servicePack.service')
module.exports = {
    authServices,
    userServices,
    timeshareServices,
    resortServices,
    requestServices,
    reservationServices,
    unitServices,
    tripServices,
    paymentServices,
    servicePackServices,
}

