const bcrypt = require('bcrypt');
const moment = require("moment");
const UserId = require('../../controllers/v1/user');
const TimeshareModel = require("../../models/timeshares");
const ReservationModel = require('../../models/reservations');
const RequestModel = require('../../models/requests')
const nodemailer = require("nodemailer");
const {uploadToS3} = require("../../utils/s3Store");
const ResortModel = require("../../models/resorts");
const paypal = require("paypal-rest-sdk");
const {StatusCodes} = require("http-status-codes");
const PaymentModel = require('../../models/payments')
const UserModel = require('../../models/users')
const ServicePackModel = require('../../models/servicePacks'); // Import model ServicePack


class PaymentService {

    //return PayPal checkout link
    async CreatePayment(paymentInfo) {
        const create_payment_json = {
            "intent": "sale",
            "payer": {
                "payment_method": "paypal"
            },
            "redirect_urls": {
                "return_url": `http://localhost:3000/post/${paymentInfo.postId}/book/review-order/${paymentInfo._id}`,
                "cancel_url": "http://localhost:3000/cancel"
            },
            "transactions": [{
                "item_list": {
                    "items": [{
                        "name": paymentInfo.fullName,
                        "sku": paymentInfo._id.toString(), // Assuming reservationId is a string
                        "price": paymentInfo.amount.toString(), // Assuming amount is a string
                        "currency": "USD",
                        "quantity": 1
                    }]
                },
                "amount": {
                    "currency": "USD",
                    "total": paymentInfo.amount.toString(), // Assuming amount is a string
                },
                "description": `Reservation for ${paymentInfo.fullName}`
            }]
        };
        paypal.payment.create(create_payment_json, function (error, payment) {
            if (error) {
                throw error;
            } else {
                for (let i = 0; i < payment.links.length; i++) {
                    if (payment.links[i].rel === 'approval_url') {
                        return payment.links[i].href
                    }
                }
            }
        });
    }

    async ExecutePayment(){
        const reservationId = req.body.reservationId;
        const payerId = req.body.PayerID;
        const paymentId = req.body.paymentId;
        const amount = req.body.totalAmount;
        console.log(amount)
        const execute_payment_json = {
            "payer_id": payerId,
            "transactions": [{
                "amount": {
                    "currency": "USD",
                    "total": amount.toString()
                }
            }]
        };
        paypal.payment.execute(paymentId, execute_payment_json, async function (error, payment) {
            if (error) {
                throw error;
            } else {
                // console.log('hello')
                // console.log(JSON.stringify(payment));
                await ReservationModel.updateOne(
                    {_id: reservationId},
                    {$set: {isPaid: true}}
                )
                    .exec()
                    .then(result => {
                        console.log('isPaid updated successfully:', result);
                    })
                    .catch(err => {
                        console.error('Error updating isPaid:', err);
                    });
                res.status(StatusCodes.OK).json({
                    status: {
                        code: res.statusCode,
                        message: 'payment data'
                    },
                    data: payment
                })
            }
        });
    }
    async RefundPayment(){

    }
    async CreateVNPay(req, userId) {
        process.env.TZ = 'Asia/Ho_Chi_Minh';
        let date = new Date();
        let createDate = moment(date).format('YYYYMMDDHHmmss');
    
        let ipAddr =
            req.headers['x-forwarded-for'] ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.connection.socket.remoteAddress;
    
        let config = require('../../configs/default.json');
    
        let tmnCode = "TG4G0CYV";
        let secretKey = "OIEUZLVYEHNDVYKFPDOAJXIMTWIDVKJT";
        let vnpUrl = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
        let returnUrl = `http://localhost:3000/payment/${userId}/vnpay_return`;
    
        let orderId = moment(date).format('DDHHmmss');
        let amount = req.body.amount;
        let bankCode = req.body.bankCode;
    
        let locale = req.body.language;
        if (locale === null || locale === '') {
            locale = 'vn';
        }
    
        let currCode = 'VND';
        let vnp_Params = {};
        vnp_Params['vnp_Version'] = '2.1.0';
        vnp_Params['vnp_Command'] = 'pay';
        vnp_Params['vnp_TmnCode'] = tmnCode;
        vnp_Params['vnp_Locale'] = locale;
        vnp_Params['vnp_CurrCode'] = currCode;
        vnp_Params['vnp_TxnRef'] = orderId;
        vnp_Params['vnp_OrderInfo'] = 'Thanh toan cho ma GD:' + orderId;
        vnp_Params['vnp_OrderType'] = 'other';
        vnp_Params['vnp_Amount'] = parseFloat(amount) * 100; // Convert amount to Number before multiplication
        vnp_Params['vnp_ReturnUrl'] = returnUrl;
        vnp_Params['vnp_IpAddr'] = ipAddr;
        vnp_Params['vnp_CreateDate'] = createDate;
        if (bankCode !== null && bankCode !== '') {
            vnp_Params['vnp_BankCode'] = bankCode;
        }
    
        vnp_Params = sortObject(vnp_Params);
    
        let querystring = require('qs');
        let signData = querystring.stringify(vnp_Params, { encode: false });
        let crypto = require("crypto");
        let hmac = crypto.createHmac("sha512", secretKey);
        let signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");
        vnp_Params['vnp_SecureHash'] = signed;
        vnpUrl += '?' + querystring.stringify(vnp_Params, { encode: false });
    
        try {
            const vnpayData = {
                orderId: orderId,
                vnp_Version: vnp_Params['vnp_Version'],
                vnp_Command: vnp_Params['vnp_Command'],
                vnp_TmnCode: tmnCode,
                vnp_Locale: locale,
                vnp_CurrCode: currCode,
                vnp_TxnRef: orderId,
                vnp_OrderInfo: 'Thanh toan cho ma GD:' + orderId,
                vnp_OrderType: vnp_Params['vnp_OrderType'],
                vnp_Amount: parseFloat(amount), // Assign the original amount here
                vnp_ReturnUrl: returnUrl,
                vnp_IpAddr: ipAddr,
                vnp_CreateDate: createDate,
                vnp_BankCode: bankCode,
                vnp_SecureHash: signed,
                transactionStatus: 'Pending',
                userId: userId,
            };
    
            const vnpay = new PaymentModel(vnpayData);
            await vnpay.save();
        } catch (error) {
            console.error(error);
        }
        return vnpUrl;
    }
    
    
    

    async VNPayReturn(req, res, next) {
        try {
            let vnp_Params = req.query;    
            let secureHash = vnp_Params['vnp_SecureHash'];
            delete vnp_Params['vnp_SecureHash'];
            delete vnp_Params['vnp_SecureHashType'];
    
            vnp_Params = sortObject(vnp_Params);
    
            let config = require('../../configs/default.json');
            let secretKey = config.vnp_HashSecret;
    
            let querystring = require('qs');
            let signData = querystring.stringify(vnp_Params, { encode: false });
            let crypto = require("crypto");
            let hmac = crypto.createHmac("sha512", secretKey);
            let signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");
            let responseData = {};
    
            if (secureHash === signed) {
                let responseData = {};
                if (vnp_Params['vnp_ResponseCode'] === '00') {
                    let payment = await PaymentModel.findOneAndUpdate({ orderId: vnp_Params['vnp_TxnRef'] }, { transactionStatus: 'Success' });
                    // console.log(payment.userId)
                    const servicePack = await ServicePackModel.findOne({ amount: payment.vnp_Amount });
                    const user = await UserModel.findOneAndUpdate({ _id: payment.userId }, { servicePack: servicePack._id });
                    // console.log(user);
                    // console.log(servicePack.role)
  
                    responseData = {
                        success: true,
                        message: 'Payment successful',
                        code: vnp_Params['vnp_ResponseCode']
                    };
                } else if (vnp_Params['vnp_ResponseCode'] === '24') {
                    let payment = await PaymentModel.findOneAndUpdate({ orderId: vnp_Params['vnp_TxnRef'] }, { transactionStatus: 'Failed' });
                    responseData = {
                        success: false,
                        message: 'Payment canceled by user',
                        code: vnp_Params['vnp_ResponseCode']
                    };
                }
                return responseData;
            } else {
                console.log("Secure hash mismatch");
                return {
                    success: false,
                    message: 'Secure hash mismatch',
                    code: '97'
                };
            }
        } catch (error) {
            console.error("Error occurred:", error);
            throw error;
        }
    }
}    
function sortObject(obj) {
    let sorted = {};
    let str = [];
    let key;
    for (key in obj){
        if (obj.hasOwnProperty(key)) {
        str.push(encodeURIComponent(key));
        }
    }
    str.sort();
    for (key = 0; key < str.length; key++) {
        sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
    }
    return sorted;
}

module.exports = new PaymentService;