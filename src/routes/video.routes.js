import { Router } from "express";
import { verifyJWT } from "../middleware/authorization.middleware.js";
import { upload } from "../middleware/multer.middleware.js";
import { verifyJWTForVideo } from "../middleware/videoAuth.middleware.js";
import { 
    deleteVideo,
    getAllVideos,
    getVideoById,
    togglePublishStatus,
    updateVideo,
    videoUpload,
} from "../controllers/video.controller.js";

const router = Router();

router
.route("/")
.get( getAllVideos )
.post(
    verifyJWT,
    upload.fields(
        [
            {
                name: "videoFile",
                maxCount: 1
            },
            {
                name: "thumbnail",
                maxCount: 1
            }
        ]
    ),
    videoUpload
)

router
.route("/:videoId")
.get( verifyJWTForVideo , getVideoById )
.delete( verifyJWT , deleteVideo )
.patch( verifyJWT , upload.single() , updateVideo );

router.route( "/toogle/publish/:videoId" ).patch( togglePublishStatus )

export default router