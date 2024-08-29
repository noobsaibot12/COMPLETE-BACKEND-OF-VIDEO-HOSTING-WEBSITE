import { Router } from "express";
import { verifyJWT } from "../middleware/authorization.middleware.js";
import { upload } from "../middleware/multer.middleware.js";
import { 
    loginUser , 
    logoutUser , 
    registerUser , 
    reasignAccessToken , 
    updatePassword,
    updateCredentials,
    updateAvatar,
    currentUser,
    serverCheck,
    updateCoverImage,
    getUserChannelInfo,
    getWatchHistory
} from "../controllers/user.controller.js"

const router = Router();

// console.log( registerUser )

//IF KOI POST REQ AATI HAI IS ROUTE PE TO HANDLE HO JAIGE LKIN YE ROUTE ABHI SIRF JSON AUR FORM DATA KE LIYE TAYAR HAI IS PE ABHI KOI FILE AAYEGI TO WO WO HANDLE NAHI HOGI.

//USE UPLOAD MIDDLEWARE WHICH WE HAVE CREATED TO HANDLE AND UPLOAD FILES.

router.route("/check").post(serverCheck);

router.route("/register").post(
    upload.fields(
        [                               //YE FIELDS EXPECT KRTA HAI EK ARRAY [] SO YE DENA MT BHULNA 
            {
                name: "avatar",         //SO ABHI YE AVATAR FILE ASCEPT KRNE KE LIYE TAYAR HAI
                maxCount: 1             //EK WAQT PE EK HI AVTAR UPLOAD HOGA
            },
            {
                name: "coverImage",     //SAME GOES HERE
                maxCount: 1             //AND HERE
            }
        ]
    ),
    registerUser
)
router.route("/login").post( upload.none() , loginUser)

router.route("/logout").post(verifyJWT,  logoutUser)

router.route("/update-password").post(verifyJWT , upload.none() , updatePassword)

router.route("/update-credentials").patch(verifyJWT, upload.none() ,  updateCredentials)

router.route("/refresh").post( reasignAccessToken )

router.route("/current-user").get( verifyJWT , currentUser );

router.route("/avatar").patch(verifyJWT , upload.single("avatar") , updateAvatar)

router.route("/cover-image").patch(verifyJWT , upload.single("coverImage") , updateCoverImage)

router.route("/c/:username").get(verifyJWT, getUserChannelInfo)

router.route("/history").get(verifyJWT, getWatchHistory)

export default router;