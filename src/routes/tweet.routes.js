import { Router } from "express";
import { verifyJWT } from "../middleware/authorization.middleware.js";
import { 
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
} from "../controllers/tweet.controller.js";
import { upload } from "../middleware/multer.middleware.js";

const router = Router();
router.use(verifyJWT);

router.route("/").post(upload.none() , createTweet );
router.route("/user/:userId").get(getUserTweets);
router.route("/:tweetId").patch( upload.none() , updateTweet).delete(deleteTweet);

export default router;