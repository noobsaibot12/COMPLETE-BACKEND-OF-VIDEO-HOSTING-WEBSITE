import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {

    const { content } = req.body;
    const owner = req.user._id;

    // console.log( "REQUEST :- " , owner )

    if ( !content ) throw new ApiError ( 404 , "Content Required!!" );
    if ( !owner ) throw new ApiError ( 404 , "Unauthorized Request!!" );

    const tweet = await Tweet.create(
        {
            content,
            owner: owner
        }
    )

    if ( !tweet ) throw new ApiError ( 500 , "Tweet not created!!" );

    // console.log( "Tweet :- " , tweet );

    return res
    .status( 200 )
    .json(
        new ApiResponse (
            200,
            tweet,
            "Tweet created Successfully!!"
        )
    )

})

// const getUserTweets = asyncHandler(async (req, res) => {
//     // TODO: get user tweets
//     const {userId} = req.params;
//     if (!isValidObjectId(userId)) {
//         throw new ApiError(404, "User not found");
//     }

//     const userTweets = await Tweet.find({
//         owner: userId
//     });
    
//     return res.status(200).json(new ApiResponse(200, userTweets, "Get user tweets "))
// })

const getUserTweets = asyncHandler(async (req, res) => {
    const { userId } = req.params;
  
    if (!isValidObjectId(userId))
      throw new ApiError(400, "Invalid userId: " + userId);
  
    const allTweets = await Tweet.aggregate([
      {
        $match: {
          owner: new mongoose.Types.ObjectId(userId),
        },
      },
      // sort by latest
      {
        $sort: {
          createdAt: -1,
        },
      },
      // fetch likes of tweet
      {
        $lookup: {
          from: "likes",
          localField: "_id",
          foreignField: "tweet",
          as: "likes",
          pipeline: [
            {
              $match: {
                liked: true,
              },
            },
            {
              $group: {
                _id: "liked",
                owners: { $push: "$likedBy" },
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "likes",
          localField: "_id",
          foreignField: "tweet",
          as: "dislikes",
          pipeline: [
            {
              $match: {
                liked: false,
              },
            },
            {
              $group: {
                _id: "liked",
                owners: { $push: "$likedBy" },
              },
            },
          ],
        },
      },
      // Reshape Likes and dislikes
      {
        $addFields: {
          likes: {
            $cond: {
              if: {
                $gt: [{ $size: "$likes" }, 0],
              },
              then: { $first: "$likes.owners" },
              else: [],
            },
          },
          dislikes: {
            $cond: {
              if: {
                $gt: [{ $size: "$dislikes" }, 0],
              },
              then: { $first: "$dislikes.owners" },
              else: [],
            },
          },
        },
      },
      // get owner details
      {
        $lookup: {
          from: "users",
          localField: "owner",
          foreignField: "_id",
          as: "owner",
          pipeline: [
            {
              $project: {
                username: 1,
                avatar: 1,
                fullName: 1,
              },
            },
          ],
        },
      },
      {
        $unwind: "$owner",
      },
      {
        $project: {
          content: 1,
          createdAt: 1,
          updatedAt: 1,
          owner: 1,
          totalLikes: {
            $size: "$likes",
          },
          totalDisLikes: {
            $size: "$dislikes",
          },
          isLiked: {
            $cond: {
              if: {
                $in: [req.user?._id, "$likes"],
              },
              then: true,
              else: false,
            },
          },
          isDisLiked: {
            $cond: {
              if: {
                $in: [req.user?._id, "$dislikes"],
              },
              then: true,
              else: false,
            },
          },
        },
      },
    ]);
  
    return res
      .status(200)
      .json(new ApiResponse(200, allTweets, "all tweets send successfully"));
});

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const {tweetId} = req.params;
    const {content} = req.body;

    // console.log( "Cuntent of Updated Tweet :- " , req.body )

    if(!content){
        throw new ApiError(400, "tweet content is not filled");
    }

    const updateTweetContent = await Tweet.findByIdAndUpdate(tweetId,{
        $set:{
            content: content
        }
    },
    {new: true}
    )

    return res.status(200)
    .json(new ApiResponse(200, updateTweetContent, "Tweet Updated Successfully"))
})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const {tweetId} = req.params;

    await Tweet.deleteOne({
        _id: tweetId
    })

    return res.status(200)
    .json(new ApiResponse(200, {}, "Tweet Deleted Successfully"))
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}