import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Video } from "../models/video.model.js"
import { Comment } from "../models/comment.model.js";
import mongoose from "mongoose";

// const getVideoComments = asyncHandler(async (req, res) => {
//     //TODO: get all comments for a video
//     const {videoId} = req.params
//     const {page = 1, limit = 10} = req.query
    
//     if (!videoId) {
//         throw new ApiError(400, "Invalid video ID")
//     }

//     const skip = (page - 1) * limit
//     const comments = await Comment.find({video: videoId}).skip(skip).limit(limit)

//     return res.status(200)
//         .json(new ApiResponse(200, comments, "Fetch All Comments Successfully"))

// })

// const getVideoComments = asyncHandler(async (req, res) => {
//     const { videoId } = req.params;
//     const { page = 1, limit = 10 } = req.query;
  
//     if (!videoId) throw new ApiError(400, "Invalid VideoId");
  
//     const options = {
//       page,
//       limit,
//     };
  
//     const video = await Video.findById(videoId);
  
//     const allComments = await Comment.aggregate([
//       {
//         $match: {
//           video: new mongoose.Types.ObjectId(videoId),
//         },
//       },
//       // sort by date
//       {
//         $sort: {
//           createdAt: -1,
//         },
//       },
//       // fetch likes of Comment
//       {
//         $lookup: {
//           from: "likes",
//           localField: "_id",
//           foreignField: "comment",
//           as: "likes",
//           pipeline: [
//             {
//               $match: {
//                 liked: true,
//               },
//             },
//             {
//               $group: {
//                 _id: "liked",
//                 owners: { $push: "$likedBy" },
//               },
//             },
//           ],
//         },
//       },
//       {
//         $lookup: {
//           from: "likes",
//           localField: "_id",
//           foreignField: "comment",
//           as: "dislikes",
//           pipeline: [
//             {
//               $match: {
//                 liked: false,
//               },
//             },
//             {
//               $group: {
//                 _id: "liked",
//                 owners: { $push: "$likedBy" },
//               },
//             },
//           ],
//         },
//       },
//       // Reshape Likes and dislikes
//       {
//         $addFields: {
//           likes: {
//             $cond: {
//               if: {
//                 $gt: [{ $size: "$likes" }, 0],
//               },
//               then: { $first: "$likes.owners" },
//               else: [],
//             },
//           },
//           dislikes: {
//             $cond: {
//               if: {
//                 $gt: [{ $size: "$dislikes" }, 0],
//               },
//               then: { $first: "$dislikes.owners" },
//               else: [],
//             },
//           },
//         },
//       },
//       // get owner details
//       {
//         $lookup: {
//           from: "users",
//           localField: "owner",
//           foreignField: "_id",
//           as: "owner",
//           pipeline: [
//             {
//               $project: {
//                 fullName: 1,
//                 username: 1,
//                 avatar: 1,
//                 _id: 1,
//               },
//             },
//           ],
//         },
//       },
//       { $unwind: "$owner" },
//       {
//         $project: {
//           content: 1,
//           owner: 1,
//           createdAt: 1,
//           updatedAt: 1,
//           isOwner: {
//             $cond: {
//               if: { $eq: [req.user?._id, "$owner._id"] },
//               then: true,
//               else: false,
//             },
//           },
//           likesCount: {
//             $size: "$likes",
//           },
//           disLikesCount: {
//             $size: "$dislikes",
//           },
//           isLiked: {
//             $cond: {
//               if: {
//                 $in: [req.user?._id, "$likes"],
//               },
//               then: true,
//               else: false,
//             },
//           },
//           isDisLiked: {
//             $cond: {
//               if: {
//                 $in: [req.user?._id, "$dislikes"],
//               },
//               then: true,
//               else: false,
//             },
//           },
//           isLikedByVideoOwner: {
//             $cond: {
//               if: {
//                 $in: [video.owner, "$likes"],
//               },
//               then: true,
//               else: false,
//             },
//           },
//         },
//       },
//     ]);
  
//     return res
//       .status(200)
//       .json(new ApiResponse(200, allComments, "All comments Sent"));
  
//     // TODO: Send paginated comments
  
//     Comment.aggregatePaginate(allComments, options, function (err, results) {
//       console.log("results", results);
//       if (!err) {
//         const {
//           docs,
//           totalDocs,
//           limit,
//           page,
//           totalPages,
//           pagingCounter,
//           hasPrevPage,
//           hasNextPage,
//           prevPage,
//           nextPage,
//         } = results;
  
//         return res.status(200).json(
//           new ApiResponse(
//             200,
//             {
//               Comments: docs,
//               totalDocs,
//               limit,
//               page,
//               totalPages,
//               pagingCounter,
//               hasPrevPage,
//               hasNextPage,
//               prevPage,
//               nextPage,
//             },
//             "Comments fetched successfully"
//           )
//         );
//       } else throw new APIError(500, err.message);
//     });
// });

const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!videoId) throw new ApiError(400, "Invalid VideoId");

  const video = await Video.findById(videoId);
  if (!video) throw new ApiError(404, "Video not found");

  const options = {
      page,
      limit,
  };

  const commentsAggregation = Comment.aggregate([
      { $match: { video: new mongoose.Types.ObjectId(videoId) } },
      { $sort: { createdAt: -1 } },
      {
          $lookup: {
              from: "likes",
              localField: "_id",
              foreignField: "comment",
              as: "likes",
              pipeline: [{ $match: { liked: true } }],
          },
      },
      {
          $lookup: {
              from: "likes",
              localField: "_id",
              foreignField: "comment",
              as: "dislikes",
              pipeline: [{ $match: { liked: false } }],
          },
      },
      {
          $addFields: {
              likes: "$likes.likedBy",
              dislikes: "$dislikes.likedBy",
          },
      },
      {
          $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                  {
                      $project: {
                          fullName: 1,
                          username: 1,
                          avatar: 1,
                          _id: 1,
                      },
                  },
              ],
          },
      },
      { $unwind: "$owner" },
      {
          $project: {
              content: 1,
              owner: 1,
              createdAt: 1,
              updatedAt: 1,
              isOwner: { $eq: [req.user?._id, "$owner._id"] },
              likesCount: { $size: "$likes" },
              disLikesCount: { $size: "$dislikes" },
              isLiked: { $in: [req.user?._id, "$likes"] },
              isDisLiked: { $in: [req.user?._id, "$dislikes"] },
              isLikedByVideoOwner: { $in: [video.owner, "$likes"] },
          },
      },
  ]);

  const paginatedComments = await Comment.aggregatePaginate(commentsAggregation, options);

  return res.status(200).json(new ApiResponse(200, paginatedComments, "Comments fetched successfully"));
});


const addComment = asyncHandler ( async ( req , res ) => {

    const { videoId } = req.params;
    const { description } = req.body;
    const user = req.user;

    if ( !videoId ) throw new ApiError( 404 , "videoId not found!!" );
    if ( !description ) throw new ApiError( 404 , "Description required!!" );
    if ( !user )  throw new ApiError( 404 , "Unauthorized request!!" );

    const comment = await Comment.create(
        {
            description,
            video: videoId,
            owner: user._id
        }
    );

    if ( !comment ) throw new ApiError( 500 , "Comment doc creation Failed!!" );

    // console.log( "Comment :- " , comment )

    return res
    .status( 200 )
    .json(
        new ApiResponse(
            200,
            comment,
            "Comment Added Successfully!!"
        )
    )

} )

const updateComment = asyncHandler ( async ( req , res ) => {

    const {commentId} = req.params;
    const {newDescription} = req.body;
    // console.log( "Comment ID :- " , commentId )

    if ( !commentId ) throw new ApiError ( 404 , "Comment id not Found!!" );
    if ( !newDescription ) throw new ApiError ( 404 , "Description is required!!" );

    // console.log( "Description :- " , newDescription )
    const comment = await Comment.findById( commentId )

    if ( !comment ) throw new ApiError ( 500 , "Comment not found!!" );

    comment.description = newDescription;
    await comment.save({validateBeforeSave:false})



    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            comment,
            "Comment updated successfully!!"
        )
    )

} )

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const {commentId} = req.params

    if (!commentId) {
        throw new ApiError(400, "Invalid comment ID")
    }

    await Comment.findByIdAndDelete({_id: commentId})

    return res.status(200)
    .json(new ApiResponse(200, {}, "Comment Deleted Successfully"))
})

export {
    addComment,
    updateComment,
    deleteComment,
    getVideoComments
}