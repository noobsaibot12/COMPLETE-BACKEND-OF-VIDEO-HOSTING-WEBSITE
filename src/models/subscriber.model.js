import mongoose , {Schema} from "mongoose";
import { User } from "./user.model.js";

const subscriberSchema = new Schema(
    {
        subscriber: {
            type: Schema.Types.ObjectId,
            ref: "User"
        },
        channel: {
            type: Schema.Types.ObjectId,
            ref: "User"
        }
    },
    {
        timestamps: true
    }
)

export const Subscriber = mongoose.model( "Subscriber" , subscriberSchema );