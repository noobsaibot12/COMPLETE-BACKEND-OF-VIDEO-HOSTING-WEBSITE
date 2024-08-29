import mongoose , {modelNames, Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = Schema( 
    {
        videoFile: {
            type: String,   //Cloudnary se milega video url
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        thumbnail: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        duration: {
            type: Number,
            required: true,
        },
        views: {
            type: Number,
            default: 0
        },
        isPublish: {
            type: Boolean,
            default: true
        },
        uploadedBy: {
            type: Schema.Types.ObjectId,
            ref: "User"
        }

    } , 
    {
        timestamps: true
    } 
);

videoSchema.plugin(mongooseAggregatePaginate)

export const Video = mongoose.model("Video",videoSchema);