//VVV IMP CODE BASE USED IN PRODUCTION 

const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err))
    }
}


export { asyncHandler }




// const asyncHandler = () => {}  FIRST FUNCTION

// const asyncHandler = (func) => {  FUNCTION PASSED AS PARAMETER TO THE FUNCTION AND FUNCTION IS EXECUTED INSIDE THIS FUNCTION 
//    async () => {}   THE FUNCTION EXECUTED IS A ASYNC FUNCTION
// }

// const asyncHandler = (func) => async () => {}  ADVANCE SYNTAX OF ABOVE IMPLEMENTATION { THESE ARE CALLED HIGER ORDER FUNCTION }


// const asyncHandler = (fn) => async (req, res, next) => {
//     try {
//         await fn(req, res, next)
//     } catch (error) {
//         res.status(err.code || 500).json({
//             success: false,
//             message: err.message
//         })
//     }
// }