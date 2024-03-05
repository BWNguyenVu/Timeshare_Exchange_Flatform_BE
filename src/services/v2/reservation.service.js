const bcrypt = require('bcrypt');
const moment = require("moment");
const ReservationModel = require("../../models/reservations");
const TimeshareModel = require("../../models/timeshares");
const RequestModel = require("../../models/requests");
const tripService = require("./trip.service");
const emailService = require('./email.service');

class ReservationService {
    async GetReservationOfUser(userId) {
        return await ReservationModel.find({userId: userId, isPaid: true})
    }
    async GetReservationOfPost(postId) {
        return await ReservationModel.find({postId: postId, isPaid: true})
    }
    async GetReservationById(id) {
        return await ReservationModel.findById(id).lean();
    }

    async MakeReservation(data) {
        const {
            userId, postId, reservationDate, fullName, phone, email, country,
            street,
            city,
            province,
            zipCode, amount
        } = data;
        const address = {country, street, city, province, zipCode}
        // Create a new reservation instance
        const newReservation = new ReservationModel({
            userId,
            postId,
            reservationDate,
            fullName,
            phone,
            email,
            address,
            amount,
            isPaid: false,
            status: 'pending',
        });
        return await newReservation.save().catch();
    }
    async ConfirmReservation(reservationId){
        const reservation = await ReservationModel.findById(reservationId);
        if (!reservation) {
            throw new Error('Reservation not found');
        }
        await ReservationModel.updateOne(
            { _id: reservationId },
            {
                $set: {
                    status: 'confirmed',
                    confirmed_at: new Date()
                }
            }
        );
        const post = await TimeshareModel.findById(reservation.postId);
        if (!post) {
            throw new Error('Post not found');
        }
        await TimeshareModel.updateOne(
            { _id: reservation.postId._id },
            {
                $set: {
                    is_bookable: false
                }
            }
        );
        await tripService.CreateTrip(reservation);
        return {
            reservation_id: reservation.postId,
            code: 200,
            confirmed_at: reservation.confirmed_at,
            message: 'Guest name confirmed'
        };
    }
    async ConfirmRent(reservationId) {
        try {
            const reservation = await ReservationModel.findById(reservationId);
            if (!reservation) {
                throw new Error('Reservation not found');
            }
            reservation.status = 'confirmed';
            await reservation.save();

            return reservation;
        } catch (error) {
            throw new Error('Error confirming reservation');
        }
    }

    async MakeExchange(timeshareId, myTimeshareId, type, userId, fullName, phone, email, amount) {
        try {
            const exchangeData = {
                timeshareId: timeshareId,
                myTimeshareId: myTimeshareId,
                type: 'exchange',
                userId: userId,
                fullName: fullName,
                phone: phone,
                email: email,
                amount: amount,
            };
            const timeshare = await TimeshareModel.findById(timeshareId);

            const count = await ReservationModel.countDocuments({ timeshareId: timeshareId });
            const countExchange = await ReservationModel.countDocuments({ timeshareId: timeshareId, type: 'exchange' });
            const countRent = await ReservationModel.countDocuments({ timeshareId: timeshareId, type: 'rent' });
            console.log(count);
            console.log(exchangeData);

            console.log('Current owner:', timeshare.current_owner.email);
            const to = timeshare.current_owner.email;
    
            await emailService.SendRequestExchange(to, timeshare, count, countExchange, countRent);
    
            const exchange = await ReservationModel({ ...exchangeData });
            return exchange.save().catch();
        } catch (error) {
            throw new Error('Error request');
        }
    }
    

    async ConfirmExchange(exchangeId) {
        try {
            const exchange = await ReservationModel.findById(exchangeId);
            if (!exchange) {
                throw new Error('Reservation not found');
            }
    
            // update status 
            await ReservationModel.updateOne(
                { _id: exchangeId },
                {
                    $set: {
                        status: 'confirmed',
                        confirmed_at: new Date()
                    }
                }
            );
    
            // find information of timeshare and myTimeshare
            const timeshare = await TimeshareModel.findById(exchange.timeshareId);
            const myTimeshare = await TimeshareModel.findById(exchange.myTimeshareId);
    
            if (!timeshare || !myTimeshare) {
                throw new Error('Timeshare not found');
            }
    
            // exchange and close
            await TimeshareModel.updateOne(
                { _id: exchange.timeshareId },
                {
                    $set: {
                        current_owner: myTimeshare.current_owner,
                        is_bookable: false
                    }
                }
            );
    
            await TimeshareModel.updateOne(
                { _id: exchange.myTimeshareId },
                {
                    $set: {
                        current_owner: timeshare.current_owner,
                        is_bookable: false
                    }
                }
            );
    
            // create trip 
            await tripService.CreateTripByTimeshareId(exchange);
            await tripService.CreateTripByMyTimeshareId(exchange);
            

            // const count = await ReservationModel.countDocuments({ timeshareId: exchange.timeshareId });
            // const subject = 'You have' + {count} + 'notifications about at NiceTrip';
            // const text = `Thank you for your reservation at NiceTrip, please waiting for owner acceptance`;
            // await this.SendEmail(to, subject, text);

            const toOwnerMyTimeshare = exchange.email;
            const toOwnerTimeshare = exchange.timeshareId.current_owner.email;
            console.log(toOwnerTimeshare)
            console.log(toOwnerMyTimeshare)
            await emailService.NotificationExchangeSuccessToOwnerTimeshareId(toOwnerTimeshare, exchange);
            await emailService.NotificationExchangeSuccessToOwnerMyTimeshareId(toOwnerMyTimeshare, exchange);
    
            return {
                exchange_id: exchange.timeshareId,
                code: 200,
                confirmed_at: exchange.confirmed_at,
                message: 'Guest name confirmed'
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

module.exports = new ReservationService;
