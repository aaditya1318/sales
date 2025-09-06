const SendSuccess = (res, data = [], message = "Success",) => {
    res.status(200).json({
        success: true,
        message: message,
        data: data,
        code: 200,
    });
};

const SendError = (res, statusCode = 500, err) => {
    res.status(statusCode).json({
        success: false,
        message: err,
        data: [],
        code: statusCode,
    });
};

module.exports = { SendSuccess, SendError };
