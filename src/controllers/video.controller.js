import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";

// const getAllVideos = asyncHandler ( async ( req , res ) => {

//     const videos = await Video.find();

//     console.log( videos[0].videoFile )

//     res
//     .status( 200 )
//     .json(
//         new ApiResponse(
//             200,
//             videos,
//             "Success!!"
//         )
//     )

// } )

const getAllVideos = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 10,
        query = "",
        sortBy = "createdAt",
        sortType = 1,
        userId = ""
    } = req.query;

    // console.log( "Query Parameter :- " , req.query )

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    try {
        const videoAggregate = Video.aggregate(
            [
                {
                    $match: {
                        $or: [
                            { title: { $regex: query, $options: "i" } },
                            { description: { $regex: query, $options: "i" } }
                        ]
                    }
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "uploadedBy",
                        foreignField: "_id",
                        as: "owner",
                        pipeline: [
                            {
                                $project: {
                                    _id: 1,
                                    fullName: 1,
                                    avatar: "$avatar.url",
                                    username: 1,
                                }
                            },
                        ]
                    }
                },
                {
                    $addFields: {
                        owner: { $first: "$owner" }
                    }
                },
                {
                    $sort: {
                        [sortBy]: parseInt(sortType, 10)
                    }
                }
            ]
        );

        const options = {
            page: pageNumber,
            limit: limitNumber,
            customLabels: {
                totalDocs: "totalVideos",
                docs: "videos",
            }
        };

        const result = await Video.aggregatePaginate(videoAggregate, options);

        // console.log( "Result :- " , videoAggregate )

        if (result?.videos?.length === 0) {
            return res.status(200).json(new ApiResponse(200, [], "No videos found"));
        }

        return res.status(200).json(new ApiResponse(200, result, "Videos fetched successfully"));
    } catch (error) {
        throw new ApiError(500, error.message || "Internal server error during video aggregation");
    }
});

const videoUpload = asyncHandler( async ( req , res ) => {


    //ALGORITHM TO UPLOAD VIDEO
    //TAKE DESCRIPTION AND TITLE OF VIDEO FROM USER FROM ( REQ.BODY )
    //UPLOAD THUMBNAIL AND VIDEO TO LOCAL STORAGE BEFORE UPLOADING TO CLOUDINARY
    //TAKE CARE THAT BOTH FILES ARE UPLOADED TO LOCAL BY MULTER
    //UPLOAD BOTH FILES TO CLOUDINARY 
    //CREATE VIDEO DOCUMENT 
    //SET ISPUBLISH TO TRUE
    //END

    const { description , title } = req.body;

    if ( !( description && title ) ) return new ApiError( 400 , "Desctiption and Title Required!!" );

    // console.log( "Request files" , req.files )
    // console.log( "Description Nd Title :- " , description , title )

    const videoLocalPath = req.files?.videoFile[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail[0]?.path;

    if ( !( videoLocalPath && thumbnailLocalPath ) ) return new ApiError( 400 , "Video and Thumbnail are not uploaded to local Storage!!" );

    const video = await uploadOnCloudinary( videoLocalPath );
    const thumbnail = await uploadOnCloudinary( thumbnailLocalPath );

    if ( !( video && thumbnail ) ) return new ApiError ( 300 , "Video and Thumbnail is not uploaded to Cloudinary!!" );

    const videoDocument = await Video.create(
        {
            videoFile: video.url,
            title,
            description,
            thumbnail: thumbnail.url,
            duration: video.duration,
            uploadedBy: req.user._id
        }
    ) 

    if ( !videoDocument ) return new ApiError( 404 , "Video not uploaded!!" );

    return res.
    status(200)
    .json(
        new ApiResponse(
            200,
            videoDocument,
            "Video Uploaded Successfully!!"
        )
    ) 

} )

const getVideoById = asyncHandler ( async ( req , res ) => {

    //TODO :- UPDATE VIEWS AND WATCHHISTORY

    const { videoId } = req.params;

    if ( !videoId ) return new ApiError ( 404 , "Video id Not Found!!!" );

    const video = await Video.findById( videoId );

    if ( !video ) return new ApiError ( 404 , "Video not Found!!" );

    //UPDATE VIEWS OF VIDEO
    const videoViews = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                views: video.views + 1
            }
        },
        {
            new: true
        }
    )
    // console.log( "Video :- " , videoViews )
    const userId = req.user;
    let userHistory = null;

    // console.log( userId )

    //UPDATE WATCH HISTORY
    if ( userId ) {

        userHistory = await User.findByIdAndUpdate(
            userId._id,
            { 
                $addToSet: { 
                    watchHistory: videoId 
                } 
            }, // Using $addToSet to avoid duplicates
            { 
                new: true, 
                useFindAndModify: false 
            }    // Options: new returns the updated document
        )

        // console.log('Updated Watch History:', userHistory);

    }
    
    let responseData;

    if ( userHistory ) {

        responseData = {
            userHistory,
            videoViews
        }

    } else {

        responseData = {
            videoViews
        }

    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            responseData,
            "Video Found!!"
        )
    );

} )

const deleteVideo = asyncHandler ( async ( req , res ) => {

    const videoId = req.params;
    
    if ( !videoId ) return new ApiError( 400 , "Invalid video Id!!" );

    const video = Video.findById( videoId );

    await destroyCloudImage( video.thumbnail.public_id );
    await destroyCloudVideo( video.videoFile.public_id );
    await Video.findByIdAndDelete( videoId );

    return res
    .status( 200 )
    .json(
        new ApiResponse(
            200,
            "Video deleted Successfully!!"
        )
    )

} )

const togglePublishStatus = asyncHandler(async (req, res) => {

    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(400, "Video not found")
    }
    // Toggle the isPublish field
    video.isPublished = !video.isPublished;

    // Save the updated video
    await video.save();

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            video,
            "isPublished toggle Successfully"
        )
    )

})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }

    const UpdatedVideoData = {
        title: req.body.title,
        description: req.body.description,
    };

    // console.log( "Update Data :- " , UpdatedVideoData );

    const video = await Video.findById(videoId);

    if(req.file.path !== ""){
        await destroyCloudImage(video.thumbnail.public_id)
    }

    const thumbnailLocalPath = req.file?.path;

    if (!thumbnailLocalPath) {
        throw new ApiError(400, "thumbnail file is missing")
    }

    const thumbnailUpload = await uploadOnCloudinary(thumbnailLocalPath);

    if(!thumbnailUpload.url){
        throw new ApiError(400, "Error while uloading thumbnail")
    }

    UpdatedVideoData.thumbnail = {
        public_id: thumbnailUpload.public_id,
        url: thumbnailUpload.secure_url
    }

    const updateVideoDetails = await Video.findByIdAndUpdate(videoId, UpdatedVideoData, {
        new: true,
    });

    return res.status(200)
    .json(new ApiResponse(200, updateVideoDetails, "Video Details Updated Successfully"))

})

export {
    videoUpload,
    getVideoById,
    deleteVideo,
    togglePublishStatus,
    updateVideo,
    getAllVideos
}