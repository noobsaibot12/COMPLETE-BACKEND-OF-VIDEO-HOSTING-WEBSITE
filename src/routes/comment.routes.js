// import { Router } from "express";
// import { verifyJWT } from "../middleware/authorization.middleware.js"
// import { addComment , updateComment } from "../controllers/comment.controller.js";

// const router = Router()

// router.route("/:videoId").post( verifyJWT , upload.none() , addComment );
// router.route("/upd/do").get( verifyJWT , ( req , res ) => {
//     console.log("Hiii")
// } )


// export default router


import { Router } from 'express';
import {
    addComment,
    deleteComment,
    getVideoComments,
    updateComment,
} from "../controllers/comment.controller.js"
import { verifyJWT } from "../middleware/authorization.middleware.js"
import { upload } from "../middleware/multer.middleware.js";

const router = Router();

router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/:videoId").get( upload.none() , getVideoComments).post( upload.none() , addComment);
router.route("/c/:commentId").delete(deleteComment).patch( upload.none() , updateComment);

export default router