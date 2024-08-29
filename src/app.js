import express from "express"
import cors from "cors"
import { limit } from "./constants.js";
import cookieParser from "cookie-parser";
import dotenv from "dotenv"

const app = express();

dotenv.config({
    path: './.env'
});

//config crossplatform origin
app.use( cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true
}) );

app.use( express.json({limit:limit}) );
app.use( express.urlencoded({ extended:true , limit:limit }) );
app.use( express.static("public") );  
app.use( cookieParser() );

//Import route
import userRouter from "./routes/user.routes.js";
import subscriptionRouter from "./routes/subscription.routes.js"
import videoRouter from "./routes/video.routes.js"
import commentRouter from "./routes/comment.routes.js"
import likeRouter from "./routes/like.routes.js"
import playlistRouter from "./routes/playlist.routes.js"
import tweetRouter from "./routes/tweet.routes.js"
import dashboardRouter from "./routes/dashboard.routes.js"
import healthCheckRoute from "./routes/healthcheck.routes.js"


//Router Decleration
app.use("/api/v1/users",userRouter);   
app.use("/api/v1/subscriptions", subscriptionRouter);
app.use("/api/v1/videos", videoRouter);
app.use("/api/v1/comments" , commentRouter );
app.use("/api/v1/likes", likeRouter);
app.use("/api/v1/playlist", playlistRouter)
app.use("/api/v1/tweets", tweetRouter)
app.use("/api/v1/dashboard", dashboardRouter)
app.use("/api/v1/healthcheck",healthCheckRoute)

export { app }









// import { Router } from "express";
// import { registerUser } from "../controllers/user.controller.js";

// const router = Router();

// router.route("/register").post(registerUser);

// export default router;