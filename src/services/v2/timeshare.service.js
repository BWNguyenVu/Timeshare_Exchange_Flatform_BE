const bcrypt = require('bcrypt');
const moment = require("moment");
const TimeshareModel = require("../../models/timeshares");
const ReservationModel = require('../../models/reservations');
const RequestModel = require('../../models/requests')
const nodemailer = require("nodemailer");
const {uploadToS3} = require("../../utils/s3Store");
const ResortModel = require("../../models/resorts");
const ExchangeModel = require('../../models/exchanges.js')
const appPassword = 'zvpg rhqd qcfg tszn';
const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: "bwfnguyenvu@gmail.com",
        pass: appPassword,
    },
});

class TimeshareService {

    async QueryPost(filter, options) {
        return await TimeshareModel.paginate(filter, options);
    }

    async GetAllPosts() {
        return TimeshareModel.find({}).select('_id name start_date image end_date location price deletedAt').lean();
    }

    async GetTimeShareByTrash() {
        return TimeshareModel.find({deleted: true}).populate({
            path: 'deleted',
            select: '_id name start_date end_date current_owner location price deletedAt'
        })
            .select('_id name start_date end_date current_owner location price deletedAt')
            .lean();
    }

    async GetTimeshareByCurrentOwner(current_owner) {
        return TimeshareModel
            .find({current_owner})
            .populate({
                path: 'current_owner',
                select: '_id username profilePicture role'
            })
            .lean();
    }
    async GetTimesharExchangeByCurrentOwner(current_owner) {
        try {
            const timeshares = await TimeshareModel
                .find({ current_owner, type: 'exchange' })
                .populate({
                    path: 'current_owner',
                    select: '_id username profilePicture role'
                })
                .lean();
            return timeshares;
        } catch (error) {
            console.error('Error getting timeshares by current owner:', error);
            throw error;
        }
    }
    
    // async findReservationExisted(reservationId,next) {
    //     const findReservationExisted = await ReservationModel.find({_id: reservationId})
    //     console.log(findReservationExisted)
    //     next();
    // }
    async DeleteTimeshare(timeshareId, myTimeshareId) {
        try {
        const exchangeExists = await ExchangeModel.exists({ $or: [{ timeshareId}, { myTimeshareId }] });
        const reservationExists = await ReservationModel.exists({ timeshareId});
                if (exchangeExists || reservationExists) {
            return false;
        }
        const deleteTimeshare = await TimeshareModel.delete({_id: timeshareId});
        return deleteTimeshare;
        }catch {
            throw error;
        }   
    }
     // thu vien mongoose soft-delete
    async UpdateTimeshare(req) {
        const updateTimeshare = await TimeshareModel.updateOne({_id: req.params.id}, req.body)
        return updateTimeshare;
    } // thu vien mongoose soft-delete
    async RestoreTimeshare(req) {
        const restoreTimeshare = await TimeshareModel.restore({_id: req.params.id}, req.body)
        return restoreTimeshare;
    } // thu vien mongoose soft-delete
    async ForceDeleteTimeshare(req) {
        const forceDeleteTimeshare = await TimeshareModel.deleteOne({_id: req.params.id}, req.body)
        return forceDeleteTimeshare;
    }

    async GetPostById(id) {
        return await TimeshareModel.findById(id);
    }

    async UploadPost(req, current_owner, unitId, price, start_date, end_date, resortId, images) {
        const uploadData = {
            image: images,
            current_owner: current_owner,
            unitId: unitId,
            price: price,
            start_date: start_date,
            end_date: end_date,
            resortId: resortId,
        }
        const newUpload = new TimeshareModel({...uploadData});
        return newUpload.save().catch();
    }

    async UploadPostWithS3({
                               imageFiles,
                               current_owner,
                               owner_exchange,
                               unitId,
                               numberOfNights,
                               price,
                               pricePerNight,
                               start_date,
                               end_date,
                               resortId,
                               type
                           }) {
        const imageKeys = [];
        if (!Array.isArray(imageFiles)) {
            const {key} = await uploadToS3({file: imageFiles, userId: current_owner});
            imageKeys.push(key);
        } else {
            for (const imageFile of imageFiles) {
                const {key} = await uploadToS3({file: imageFile, userId: current_owner});
                imageKeys.push(key);
            }
        }
        const uploadData = {
            images: imageKeys,
            current_owner: current_owner,
            owner_exchange:current_owner, 
            unitId: unitId,
            numberOfNights: numberOfNights,
            price: price,
            pricePerNight: pricePerNight,
            start_date: start_date,
            end_date: end_date,
            resortId: resortId,
            type: type
        }
        const newUpload = new TimeshareModel({...uploadData});
        return newUpload.save().catch();
    }

    async SubmitRentRequest(name, phone, email, userId, postId, requestId, status, verificationCode) {
        try {
            const verificationCode = Math.floor(1000 + Math.random() * 9000);
            const submitData = {
                name: name,
                phone: phone,
                postId: postId,
                userId: userId,
                requestId: requestId,
                status: status,
                email: email,
                verificationCode: verificationCode
            };
            console.log('Rent request saved:', submitRent);
            const mailOptions = {
                from: 'bwfnguyenvu@gmail.com',
                to: email,
                subject: 'Your Trip - Waiting for owner acceptance',
                text: `Hi, ${name}!\n
                Thanks for booking through NiceTrip. We received your request for the following week:\n\n
                Resort Name: Marriott's Aruba Surf Club\n
                Verification Code: ${verificationCode}\n\n
                This email was sent to ${email}\n\n`,
            };
            console.log('Confirmation email sent to:', email);
            const submitRent = new ReservationModel({...submitData});
            await transporter.sendMail(mailOptions);
            await submitRent.save();
            return submitRent;
        } catch (error) {
            console.error('Error processing rent request:', error);
            throw new ApiError('Error processing rent request', 500);
        }
    }
}

module.exports = new TimeshareService;