import mongoose , {Schema} from "mongoose";
import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"

const userSchema = new Schema( {
    username: {
        type: String,
        unique: true,
        lowercase: true,
        required: true,
        trim: true,
        index: true  //optimize search
    },
    password: {
        type: String,
        unique: true,
        required: [true,"Password is required"],
    },
    email: {
        type: String,
        unique: true,
        lowercase: true,
        required: true,
        trim: true,
    },
    fullName: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    avatar: {
        type: String,
        required: true,
    },
    coverImage: {
        type: String
    },
    watchHistory: [
        {
            type: Schema.Types.ObjectId,
            ref: "Video"
        }
    ],
    refreshToken: {
        type: String
    }
} , { timestamps: true } );

userSchema.pre("save", async function (next) {  //Arrow function is not used cauze Arrow function dont give us access to this
    if(!this.isModified("password")) return next(); 

    this.password = await bcrypt.hash(this.password, 10)
    next()
})

userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullName: this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}
userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id: this._id,
            
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}


export const User = mongoose.model("User",userSchema);