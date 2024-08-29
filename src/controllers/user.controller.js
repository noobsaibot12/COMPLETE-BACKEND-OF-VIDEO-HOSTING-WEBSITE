import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import {v2 as cloudinary} from "cloudinary"
import mongoose from "mongoose";
import fs from "fs"

const generateAccessTokenAndRefreshToken = async (userId) => {
    
    try {
        
        const user = await User.findById(userId);

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken(); 

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        return { accessToken , refreshToken }

    } catch (error) {
        
        throw new ApiErrorError(500,"Something went wrong while generating access token and refresh token");
        
    }
    

}

const serverCheck = asyncHandler(async (req, res) => {
    try {
        // Extract data from the request body
        const { data } = req.body;

        // Check if data is provided
        if (!data) {
            return res.status(400).send({ error: 'No data provided' });
        }

        // Log data for debugging (consider privacy and security aspects)
        // console.log(data);

        // Respond with a success message
        res.status(200).send({ message: 'Success!' });
    } catch (error) {
        // Log the error for debugging
        // console.error('Error occurred:', error);

        // Respond with a generic error message
        res.status(500).send({ error: 'Something went wrong!' });
    }
});

const registerUser = asyncHandler( async ( req , res ) => {
    
    //First thing while creating the controler or writing the controler is writing about the algorithm 
    //First thing is think about how are we approaching the problem 
    //like for this one is about REGESTERING THE USER I.E WHAT WOULD BE THE POINTS TO REMEMBER WHILE REGESTERING THE USER


    //---ALGORITHM---//

    //FIRST PT :- WHAT ARE REQ FIELDS MEAN WHAT INFORMATION DO WE EXPECT FROM FRONTEND
    //SECOND PT :- JO REQUIRED FIELDS HAI WO USER ENTER KAR RA HAI KI KOI FIELD EMPTY BHI CHOD DI HAI YE SB VALIDATION ME AATA HAI
    //THIRD PT :- CHECK KR LO KI EXISTING USER HAI YA NAHI YE HUM KOI BHI EK UNIQUE INFO SE CHECK KR SKTE HAI EXAMPLE KE LIYE ( EMAIL , PHONE , USERNAME , ETC )
    //FOURTH PT :- KI ABHI FORM KA DATA HUM LE SKTE HAI AUR HMNE USKE LIYE SETUP BHI KR LIYA HAI LKIN AB FILES KO NHI HANDLE KRNA HAI
    //FIFTH PT :- FILES ME AATE HAI KI JO AVTAR/PROFILE PIC HAMARE PROJECT ME UPLOAD HONE WALA HAI WO BARABAR SE UPLOAD HO JAI 
    //SIXTH PT :- PAILE MULTER SE LOCAL ME UPLOAD KRNA HAI PHIR USE LOCAL SE CLOUDINARY PE UPLOAD KRNA HAI SO YE FILE HANDELING K BHI DHAYAN RKNA HAI
    //SEVENTH PT :- ABHI SB KUCH HO GAYA HAI FORM KA DATA INAGES JSON SO AB HUME USER CREATE KRNA MANE USKI DATABASE ME ENTRY KRNI HAI
    //EIGHT PT :- USER CREATE KRNE KE BAD CHECK KRLO KI SACH ME USER DB ME CREATE HUA HAI KYA AGAR HUA HAI TO USER KO RESPOSE BHEJ DO KI CREATE HO GAYA HAI APKA USER

    //NOTE :- JB USER KO RESPONSE BHEK RAHE HO TB PASSWORD AUR REFRESH TOKEN MT BHEJNA

    const { username , email , fullName , password } = req.body;
    //FIRST STEP

    if( 
        [ username , email , fullName , password ].some( (field) => field?.trim() === "" )
    ) {
        throw new ApiError( 404 , "Every field is required!! " );
    }
    //SECOND STEP DONE

    const existingUser = await User.findOne( {

        $or: [ { username } , { email } ]           //$GIVES US THE ASCESS OF CONDITIONAL OPERATORS EXAMPLE OR AND XOR ETC

    } )

    // console.log(existingUser)

    if ( existingUser ) throw new ApiError( 409 , "User with username or email already exist!!" );
    //THIRD STEP DONE

    const avatarLocalPath = req.files?.avatar[0]?.path;            //?USED TO CHECK IF THE REQUESTED THING IS PRESENT OR NOT
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    // console.log( req.files );

    //HANDELING COVERIMAGE PROPERLY USING CLASICAL JAVASCRIPT 

    let coverImageLocalPath;
    if ( req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0 ) {
       coverImageLocalPath = req.files.coverImage[0].path;         //SO WHAT THIS DOES IS IF COVERIMAGE IS NOT SEND BY USER THEN EMPTY STRING IS STORED IN DATABASE
    }

    if ( !avatarLocalPath ) throw new ApiError( 400 , "Avatar is required!!" );
    //FOURTH AND FIFTH STEP DONE

    //UPLOAD ON CLOUDINARY
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    //SIXTH STEP DONE

    if ( !avatar ) throw new ApiError( 400 , "Avatar is required!!" );

    const user = await User.create( 
        {
            fullName,
            avatar: avatar.url,
            coverImage: coverImage?.url || "",
            email,
            password,
            username: username.toLowerCase(),
        }
    )
    //SEVEN STEP DONE

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if ( !createdUser ) throw new ApiError( 500 , "User is not registered due to issues from our side!!" );

    return res.status(201).json(
        new ApiResponse( 200 , createdUser , "Successfully created User!!")
    );

} )

const loginUser = asyncHandler( async ( req , res ) => {
    
    //WHAT THE CLIENT NEED TO SEND TO LOGIN ( REQ OBJECT )
    //VALIDATION
    //FIND USER EXIST IN THE DATABASE WITH GIVEN CREDENTIALS IN THE DATABASE
    //IF USER FOUND WITH EMAIL OR USERNAME THEN CHECK PASSWORD
    //CREATE ACCESS AND REFRESH TOKENS
    //RETURN COOKIE AND RESPONSE

    const { username , email , password } = req.body

    // console.log(req.body)

    // console.log(email)

    if ( !email && !username ) throw new ApiError( 400 , "Email and Password are missing dont know why" );
    if (!password) throw new ApiError(400, "Password is required");
    

    const user = await User.findOne(
        {
            $or: [ {email} , {username} ],          //CAN BE DONE USING ONLY ONE FIELD USERNAME BUT TO LEARN USE OF $OR WE DO THIS
        }
    )

    if ( !user ) throw new ApiError( 404 , "User do not exist" );

    const isPasswordValid = await user.isPasswordCorrect(password);

    if ( !isPasswordValid ) throw new ApiError(402 , "Password is invalid");

    const { accessToken , refreshToken } = await generateAccessTokenAndRefreshToken(user._id);

    user.refreshToken = refreshToken;
    await user.save({validateBeforeSave: false});

    const logedInUser = await User.findById(user._id).select("-password -refreshTokn");

    const options = {               //BEFORE SENDING COOKIE WE HAVE TO CREATE SOME OPTIONS
        httpOnly: true,             //HTTPONLY TRUE MEANS COOKIE CAN BE MODIEEFIED FROM SERVER SIDE ONLY
        secure: true                //SECURE TRUE ALSO DOES THE SAME
    }

    return res
    .status(200)
    .cookie("accessToken" ,accessToken ,options)        //SENDING COOKIE AS RESPONSE ( ACCESSTOKEN )
    .cookie("refreshToken" ,refreshToken , options)     //SENDING COOKIE AS RESPONSE ( REFRESHTOKEN ) WE GET THIS .COOKIE FROM COOKIEPARSER
    .json(
        new ApiResponse(
            200,
            {
                user: logedInUser, accessToken , refreshToken       //ALTHOUGH WE HAVE SEND ACCESS AND REFRESHTOKEN AS COOKIE IN RESPONSE BUT IT IS GOOD PRACTICE TO SEND IT IN APIRESPONSE SO THAT USER CAN STORE BOTH TOKEN ON HIS LOCAL 
            },
            "User loged in successfully"
        )
    )

} )

const logoutUser = asyncHandler(async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 // this removes the field from document
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))
})

const reasignAccessToken = asyncHandler( async ( req , res ) => {

    //WHILE UPDATING ACCESS TOKEN WITH HELP OF REFRESH TOKEN
    //FIRST EXTRACT REFRESH TOKEN FROM REQ.COOKIE 
    //VALIDATE
    //DECODE THE ENCRYPTED VALUE WITH HELP OF jwt.verify()
    //THEN EXTRACT USERID FROM DECODED TOKEN
    //FIND USER WITH HELP OF THE ID
    //CHECK IF USER'S REFRESH TOKEN AND REQUESTED REFRESH TOKEN ARE SAME OR NOT
    //IF NOT THEN REFRESH TOKEN IS EXPIRED AND USER HAS TO RELOGIN
    //THEN IF YOU REACH TILL HERE THEN GENERATE REFRESH AND ACCESS TOKENS
    //PROVIDE ACCESS TOKEN IN FORM OF COOKIE

    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
    
        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }
    
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
            
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessTokenAndRefreshToken(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200, 
                {accessToken, refreshToken: newRefreshToken},
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }

} )

const updatePassword = asyncHandler ( async ( req , res ) => {

    const { oldPassword , newPassword , conformPassword } = req.body;

    if ( !oldPassword || !newPassword || !conformPassword ) throw new ApiError( 400 , "All fields are required" );

    if ( newPassword !== conformPassword ) throw new ApiError( 404 , "Password do not match with new Password" );

    const user = await User.findById(req.user._id);

    const isPasswordValid = await user.isPasswordCorrect(oldPassword);

    if ( !isPasswordValid ) throw new ApiError( 403 , "old Password provided by u is Incorrect" );

    user.password = newPassword;
    await user.save({validateBeforeSave:false});

    // await User.findByIdAndUpdate(
    //     user._id,
    //     {
    //         $set: {
    //             password: newPassword
    //         }
    //     }
    // )

    // await user.save();

    return res
    .status(200)
    .json(
        new ApiResponse(200 , {} , "Password updated successfully!!"),
    )

} )

const updateCredentials = asyncHandler( async ( req , res ) => {

    let { username , fullName , email } = req.body;

    // console.log(username);
    // console.log(fullName);
    // console.log(email);

    if ( !username ) username = req.user.username;

    if ( !fullName ) fullName = req.user.fullName;

    if ( !email ) email = req.user.email;

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                username: username,
                fullName : fullName,
                email
            }
        },
        {
            new: true
        }
    ).select("-password -refreshToken");

    return res
    .status(200)
    .json( new ApiResponse(
        200,
        user,
        "Credentials updated successfully!!"
    ) )

} )

const currentUser = asyncHandler ( async ( req , res ) => {

    try {
        return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                req.user,
                "--Current user fetched successfully--"
            )
        )
    
    } catch (error) {
        return res
        .status(400)
        .json( new ApiResponse(
            400,
            "No users found"
        ) )
    }
} )

const updateAvatar = asyncHandler(async(req, res) => {

    const temporaryUser = await User.findById(req.user._id);

    const oldAvatarUrl = temporaryUser.avatar;

    // console.log(temporaryUser.avatar);

    const avatarLocalPath = req.file?.path

    // console.log(avatarLocalPath)

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    //TODO: delete old image - assignment

    // Delete old image from Cloudinary if it exists
    if (oldAvatarUrl) {
        const oldPublicId = oldAvatarUrl.split('/').pop().split('.')[0]; // Extract the public ID from the URL
        await cloudinary.uploader.destroy(oldPublicId);
    }


    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) throw new ApiError(400, "Error while uploading on Cloudinary")

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {
            new: true
        }
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Avatar image updated successfully")
    )
})

const updateCoverImage = asyncHandler(async(req, res) => {

    const temporaryUser = await User.findById(req.user._id);

    const oldAvatarUrl = temporaryUser.avatar;

    const coverImageLocalPath = req.file?.path

    // console.log(avatarLocalPath)

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    //TODO: delete old image - assignment

    if (oldAvatarUrl) {
        const oldPublicId = oldAvatarUrl.split('/').pop().split('.')[0]; // Extract the public ID from the URL
        await cloudinary.uploader.destroy(oldPublicId);
    }


    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) throw new ApiError(400, "Error while uploading on Cloudinary")

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {
            new: true
        }
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "coverImage image updated successfully")
    )
})

const getUserChannelInfo = asyncHandler( async( req , res ) => {

    const {username} = req.params;

    if ( !username?.trim() ) throw new ApiError( 400 , "username not found" )

    //NOW FIRST TIME WE ARE USING AGGREGATION PIPELINES 

    const channel = await User.aggregate(
        [
            {
                $match: {       //SO THIS MATCH HELPS TO FIND THE MATCHING USER ON BASIS OF USERNAME FIELD
                    username: username?.toLowerCase(),
                },
                //NOW WE FOUND ONE MATCHING USER NOW I WANT TO FIND HIS SUBS COUNT AND COUNT OF HIS SUBSCRIBED PEOPLE
                
            },
            {       //THIS LOOKUP FIND THE SUBSCRIBER COUNT FOR THE USER
                $lookup: {      //( IT BASICALLY JOIN TWO MODEL THIS LOCAL AND FORIGN MODEL ON BASIS OF A PARTICULAR FIELD )
                    from: "subscribers",
                    localField: "_id",
                    foreignField: "channel",
                    as: "subsCount"
                }
            },
            {       //FINDS SUBSTO COUNT
                $lookup: {
                    from: "subscribers",
                    localField: "_id",
                    foreignField: "subscriber",
                    as: "subscribedToCount"
                }
            },
            {       //THIS BASICALLY ADD FIELDS TO OUR SCHEMA AND ALSO KEEP OLD FIELDS
                $addFields: {
                    subscriberCount: {                  //ADDS THIS FIELD IN USER SCHEMA
                        $size: "$subsCount"             //FIND NO OF SUBS I.E( OBJECTS )
                    },
                    channelSubscribedToCount: {         //ADDS -------||-------
                        $size: "$subscribedToCount"
                    },
                    isSubscribed: {
                        $cond: {
                            if: { $in: [ req.user?._id , "$subsCount.subscriber" ] },
                            then: true,
                            else: false
                        }
                    }
                }
            },
            {
                $project: {
                    fullName: 1,
                    username: 1,
                    coverImage: 1,
                    avatar: 1,
                    email: 1,
                    subscriberCount: 1,
                    channelSubscribedToCount: 1,
                    isSubscribed: 1
                }
            }
        ]
    )

    if ( !channel?.length ) throw new ApiError( 404 , "Channel does not exist!!" );

    // console.log("Channel value :- " , channel);

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            channel[0],
            "User channel fetched successfully!!"
        )
    )

} )

const getWatchHistory = asyncHandler(async(req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "uploadedBy ",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    // Handle case where no user is found
    if (!user.length) {
        return res.status(404).json(new ApiResponse(404, null, "User not found"));
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "Watch history fetched successfully"
        )
    )
})

export { 
    registerUser,
    loginUser,
    logoutUser,
    reasignAccessToken,
    updatePassword,
    updateCredentials,
    currentUser,
    updateAvatar,
    serverCheck,
    updateCoverImage,
    getUserChannelInfo,
    getWatchHistory
}