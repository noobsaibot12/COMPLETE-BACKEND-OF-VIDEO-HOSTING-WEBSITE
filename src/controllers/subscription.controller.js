import mongoose, {isValidObjectId} from "mongoose"
// import {User} from "../models/user.controller"
import { Subscriber } from "../models/subscriber.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
  
    if (!isValidObjectId(channelId)) throw new ApiError(400, "Invalid ChannelId");
  
    let isSubscribed;
  
    const findRes = await Subscriber.findOne({
      subscriber: req.user?._id,
      channel: channelId,
    });

    // console.log( findRes );
  
    if (findRes) {
      const res = await Subscriber.deleteOne({
        subscriber: req.user?._id,
        channel: channelId,
      });
      isSubscribed = false;
    } else {
      const newSub = await Subscriber.create({
        subscriber: req.user?._id,
        channel: channelId,
      });
      if (!newSub) throw new ApiError(500, "Failed to toggle Subscription");
      isSubscribed = true;
    }
  
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { isSubscribed },
          `${isSubscribed ? "Subscribed successfully" : "Un-Subscribed successfully"}`
        )
      );
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {subscriberId} = req.params;

    // console.log( "subscriberId :- " , subscriberId)

    if(!isValidObjectId(subscriberId)) {
        throw new ApiError(400, "subscriberId is required.")
    }

    const channel = await Subscriber.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(`${subscriberId}`)
            }
        }
    ])

    const subscriberCount = channel.length;

    return res
    .status(200)
    .json(
        new ApiResponse(200, subscriberCount, "Succesfully fetched number of subscriber of the given channelID.")
    )
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const {channelId} = req.params;

    if(!isValidObjectId(channelId)) {
        throw new ApiError(400, "SubscriberID is required.")
    }


    const channel = await Subscriber.aggregate([
        {
            $match: {
                $and: [
                    {
                        channel: new mongoose.Types.ObjectId(`${channelId}`),
                        subscriber: new mongoose.Types.ObjectId(`${req.user._id}`)
                    }
                ]
            }
        }
    ])

    const isSubscribed = channel.length;

    return res
    .status(200)
    .json(
        new ApiResponse(200, isSubscribed, "User subscribed or not is checked.")
    )

})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}