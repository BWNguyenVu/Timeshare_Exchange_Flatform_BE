const express = require('express');
const {timeshareServices, resortServices} = require('../../services/v2');
const app = express();
const fs = require('fs');
const path = require('path');
const RequiredFieldError = require('../../errors/requiredFieldError.js');
const S3UploadError = require('../../errors/s3UploadError.js');
const DataProcessingError = require('../../errors/dataProcessingError.js');
const { StatusCodes } = require('http-status-codes');


const query = require("../../utils/query");

class Timeshares {

    async GetPost(req, res, next){
        const filter = query(req.query, ['resort', 'current_owner']);
        filter.deleted = { $ne: true };
        const options = query(req.query, ['page']);
        const results = await timeshareServices.QueryPost(filter, options);
        res.status(StatusCodes.OK).json({
            status: {
                code: res.statusCode,
                message: 'Query posts'
            },
            data: results
        })
    }
    async GetPostById(req, res, next) {
        const {id} = req.params;
        try {
            const postData = await timeshareServices.GetPostById(id);
            res.status(StatusCodes.OK).json({
                status: {
                    code: res.statusCode,
                    message: 'Post found'
                },
                data: postData
            })
        } catch {
            res.status(StatusCodes.NO_CONTENT).json({
                status: {
                    code: res.statusCode,
                    message: 'Post not found'
                },
                data: null
            })
        }
    };
    async GetAllPosts(req, res, next) {
        try {
            res.status(StatusCodes.OK).json({
                status: {
                    code: res.statusCode,
                    message: 'Timeshare found'
                },
                data: timeshareList
            })
        } catch {
            res.status(StatusCodes.NO_CONTENT).json({
                status: {
                    code: res.statusCode,
                    message: 'Timeshare not found'
                },
                data: null
            })
        }
    };
    async GetTimeshareByCurrentOwner(req, res, next) {
        try{
            const {current_owner} = req.params;
            const timeshareData = await timeshareServices.GetTimeshareByCurrentOwner(current_owner);
            if (timeshareData) {
                res.status(StatusCodes.OK).json({
                    status: {
                        code: res.statusCode,
                        message: 'Timeshare found'
                    },
                    data: timeshareData
                })
                return;
            }
            res.status(StatusCodes.NO_CONTENT).json({
                status: {
                    code: res.statusCode,
                    message: 'Timeshare not found'
                },
                data: timeshareData
            })
        }catch(err){
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                status: {
                    code: res.statusCode,
                    message: 'Server error'
                },
                data: null
            })
        }

    };
    async GetTimesharExchangeByCurrentOwner(req, res, next) {
        try{
            const {current_owner} = req.params;
            const timeshareData = await timeshareServices.GetTimesharExchangeByCurrentOwner(current_owner);
            if (timeshareData) {
                res.status(StatusCodes.OK).json({
                    status: {
                        code: res.statusCode,
                        message: 'Timeshare found'
                    },
                    data: timeshareData
                })
                return;
            }
            res.status(StatusCodes.NO_CONTENT).json({
                status: {
                    code: res.statusCode,
                    message: 'Timeshare not found'
                },
                data: timeshareData
            })
        }catch(err){
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                status: {
                    code: res.statusCode,
                    message: 'Server error'
                },
                data: null
            })
        }

    };
    async DeleteTimeshare(req, res, next) {
        try {
            const { timeshareId } = req.params;
            const { myTimeshareId } = req.body;


            const deleteTimeshare = await timeshareServices.DeleteTimeshare(timeshareId, myTimeshareId);
            res.status(StatusCodes.OK).json({
                status: {
                    code: res.statusCode,
                    message: 'Deleted'
                },
                data: deleteTimeshare
            })
        } catch {
            res.status(StatusCodes.NO_CONTENT).json({
                status: {
                    code: res.statusCode,
                    message: 'Delete failed'
                },
                data: deleteTimeshare
            })
        }
    };
    async UpdateTimeshare(req, res, next) {
        try {
            const updateTimeshare = await timeshareServices.UpdateTimeshare(req);
            res.status(StatusCodes.OK).json({
                status: {
                    code: res.statusCode,
                    message: 'Updated'
                },
                data: updateTimeshare
            })
        } catch {
            res.status(StatusCodes.NO_CONTENT).json({
                status: {
                    code: res.statusCode,
                    message: 'Update Failed'
                },
                data: updateTimeshare
            })
        }
    };
    async RestoreTimeshare(req, res, next) {
        try {
            const restoreTimeshare = await timeshareServices.RestoreTimeshare(req);
            res.status(StatusCodes.OK).json({
                status: {
                    code: res.statusCode,
                    message: 'Restored'
                },
                data: restoreTimeshare
            })
        } catch {
            res.status(StatusCodes.NO_CONTENT).json({
                status: {
                    code: res.statusCode,
                    message: 'Restore failed'
                },
                data: restoreTimeshare
            })
        }
    };
    async ForceDeleteTimeshare(req, res, next) {
        try {
            const forceDeleteTimeshare = await timeshareServices.ForceDeleteTimeshare(req);
            res.status(StatusCodes.OK).json({
                status: {
                    code: res.statusCode,
                    message: 'Force Deleted Successful'
                },
                data: forceDeleteTimeshare
            })
        } catch {
            res.status(StatusCodes.NO_CONTENT).json({
                status: {
                    code: res.statusCode,
                    message: 'Force failed'
                },
                data: forceDeleteTimeshare
            })
        }
    };
    async GetTimeShareByTrash(req, res, next) {
        try {
            const trashList = await timeshareServices.GetTimeShareByTrash();
            res.status(StatusCodes.OK).json({
                status: {
                    code: res.statusCode,
                    message: 'Trash list found'
                },
                data: trashList
            })
        } catch {
            res.status(StatusCodes.NO_CONTENT).json({
                status: {
                    code: res.statusCode,
                    message: 'Trash list not found'
                },
                data: trashList
            })
        }
    };
    async PostTimeshare(req, res, next) {
        res.render('timeshare/home.hbs')
    };
    async UploadPost(req, res) {
        try {
            const uploadedFiles = req.files;
            const images = [];
            for (const uploadedFile of uploadedFiles) {
                const fileNameWithoutExtension = path.parse(uploadedFile.filename).name;
                const newFileName = fileNameWithoutExtension + '.png';
                const newFilePath = path.join(uploadedFile.destination, newFileName);
                fs.renameSync(uploadedFile.path, newFilePath);
                images.push({path: newFileName});
            }
            const {current_owner, resortId, unitId, price, start_date, end_date} = req.body;
            const uploadedFileInfo = await timeshareServices.UploadPost(
                req,
                resortId,
                unitId,
                current_owner,
                price,
                start_date,
                end_date,
                images
            );

            console.log('Uploaded files information:', uploadedFileInfo);
            res.status(StatusCodes.OK).json({
                status: {
                    code: res.statusCode,
                    message: 'Uploaded successful'
                },
                data: uploadedFileInfo
            });
        } catch (error) {
            console.error(error);
            res.status(StatusCodes.NO_CONTENT).json({
                status: {
                    code: res.statusCode,
                    message: 'Upload failed'
                },
                data: uploadedFileInfo
            });
        }

    };
    async UploadPostWithS3(req, res, next) {
        try {
            const imageFiles = req.files.imageFiles;
            const {current_owner, owner_exchange, resortId, unitId, numberOfNights, price, pricePerNight, start_date, end_date, type} = req.body;
            
            // Kiểm tra xem các trường bắt buộc có được cung cấp không
            if (!imageFiles || !current_owner || !resortId || !unitId || !numberOfNights || !price || !pricePerNight || !start_date || !end_date || !type) {
                throw new RequiredFieldError('Missing required fields');
            }
            
            // Xử lý tải lên và xử lý dữ liệu
            const uploadedData = await timeshareServices.UploadPostWithS3({
                imageFiles,
                resortId,
                unitId,
                current_owner,
                owner_exchange,
                numberOfNights,
                price,
                pricePerNight,
                start_date,
                end_date,
                type
            });
            
            res.status(StatusCodes.OK).json({
                status: {
                    code: res.statusCode,
                    message: 'Uploaded successful'
                },
                data: uploadedData
            });
        } catch (error) {
            if (error instanceof RequiredFieldError) {
                res.status(StatusCodes.BAD_REQUEST).json({
                    status: {
                        code: StatusCodes.BAD_REQUEST,
                        message: error.message
                    }
                });
            } else if (error instanceof S3UploadError) {
                res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                    status: {
                        code: StatusCodes.INTERNAL_SERVER_ERROR,
                        message: 'Error uploading files to S3'
                    }
                });
            } else if (error instanceof DataProcessingError) {
                res.status(StatusCodes.BAD_REQUEST).json({
                    status: {
                        code: StatusCodes.BAD_REQUEST,
                        message: 'Error processing data'
                    }
                });
            } else {
                res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                    status: {
                        code: res.statusCode,
                        message: error.message
                    }
                });
            }
        }
    }
    
    async SubmitRentRequest(req, res) {
        try {
            const {name, phone, email, userId, postId, requestId, status, verificationCode} = req.body;
            const submitRentRequest = await timeshareServices.SubmitRentRequest(
                name,
                phone,
                email,
                userId,
                postId,
                requestId,
                status,
                verificationCode,
            );
            res.status(StatusCodes.OK).json({
                status: {
                    code: res.statusCode,
                    message: 'Submited Successful'
                },
                data: submitRentRequest
            });
        } catch (error) {
            console.error(error);
            res.status(StatusCodes.NO_CONTENT).json({
                status: {
                    code: res.statusCode,
                    message: 'Submit Failed'
                },
                data: submitRentRequest
            });
        }
    };
}

module.exports = new Timeshares;