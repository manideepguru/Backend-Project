import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import { User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import fs from "fs";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";


const generateAccessAndRefereshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;

    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };

  } catch (error) {
    console.error("Real error:", error);   
    throw new ApiError(500, "Something went wrong while generating referesh and access token");
  }
};


const registerUser = asyncHandler( async (req, res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res


    const {fullName, email, username, password } = req.body
    //console.log("email: ", email);

    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    // if (existedUser) {
    //     throw new ApiError(409, "User with email or username already exists")
    // }
    

  if (existedUser) {

  // delete local files saved by multer
    if (req.files?.avatar?.[0]?.path) {
      fs.unlinkSync(req.files.avatar[0].path);
    }

    if (req.files?.coverImage?.[0]?.path) {
      fs.unlinkSync(req.files.coverImage[0].path);
    }

    throw new ApiError(409, "User with given email or username already exists");
  }

    //console.log(req.files);

    const avatarLocalPath = req.files?.avatar[0]?.path;
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }
    

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }
   

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email, 
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )

} )

const loginUser = asyncHandler(async (req, res) =>{
    // req body -> data
    // username or email
    //find the user
    //password check
    //access and referesh token
    //send cookie

    const {email, username, password} = req.body

    if (!username && !email) {
        throw new ApiError(400, "username or email is required")
    }
    
    // Here is an alternative of above code based on logic discussed in video:
    // if (!(username || email)) {
    //     throw new ApiError(400, "username or email is required")
        
    // }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if (!user) {
        throw new ApiError(404, "User does not exist")
    }

   const isPasswordValid = await user.comparePassword(password)

   if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials")
    }

  const {accessToken, refreshToken} = await generateAccessAndRefereshTokens(user._id);


    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200, 
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged In Successfully"
        )
    )

})

const logoutUser = asyncHandler(async (req, res) => {
    // clear cookies  
    await User.findByIdAndUpdate(
        req.user._id,
        {
          $set:
            { refreshToken: undefined }
        },
        {new: true}
      );


    return res
    .status(200)
    .clearCookie("accessToken", {httpOnly: true, secure: true})
    .clearCookie("refreshToken", {httpOnly: true, secure: true})
    .json(
        new ApiResponse(
            200,{},"User logged out successfully"
        )
    )
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    // get referesh token from cookie
    // verify referesh token
    // generate new access token
    // send new access token in cookie
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
        throw new ApiError(401, "Refresh token is missing")
    }

    try {
        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

        const user = await User.findById(decoded?._id);

        if (!user) {
            throw new ApiError(401, "Invalid refresh token");
        }

        if (user.refreshToken !== refreshToken) {
            throw new ApiError(401, "Refresh token is expired");
        }

        const {accessToken, newrefreshToken} = await generateAccessAndRefereshTokens(user._id);

        const options = {
            httpOnly: true,
            secure: true
        };

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newrefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken , refreshToken: newrefreshToken },
                    "Access token refreshed successfully"
                )
            );
    } catch (error) {
        throw new ApiError(401, "Invalid or expired refresh token");
    }
});

const changecurrentpassword = asyncHandler(async (req, res) => {
    // get user from req.user
    // get old password and new password from req.body
    // compare old password
    // if not match throw error
    // hash new password
    // save user
    // return response

    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user?._id);

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const isPasswordValid = await user.comparePassword(oldPassword);

    if (!isPasswordValid) {
        throw new ApiError(400, "Invalid old password");
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed successfully"));

});

const getcurrentuser = asyncHandler(async (req, res) => {
    // get user from req.user
    // return response
    const user = await User.findById(req.user?._id).select("-password -refreshToken");

    if (!user) {
        throw new ApiError(404, "User not found");
    } 
    return res
        .status(200)
        .json(new ApiResponse(200, user, "Current user fetched successfully"));

  });

const updateaccountdetails = asyncHandler(async (req, res) => {
    // get user from req.user
    // get new email and new fullname from req.body
    // update user
    // return response

    const { email, fullName } = req.body;

    if (!email || !fullName) {
        throw new ApiError(400, "Email and full name are required");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                email,
                fullName
            }
        },
        { new: true }
    ).select("-password -refreshToken");

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Account details updated successfully"));
});

const updateavatar = asyncHandler(async (req, res) => {
    // get user from req.user
    // get avatar from req.file
    // upload avatar to cloudinary
    // update user
    // return response
    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if (!avatar.url) {
        throw new ApiError(500, "Something went wrong while uploading avatar");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        { $set: { avatar: avatar.url } },
        { new: true }
    ).select("-password -refreshToken");
    if (!user) {
        throw new ApiError(404, "User not found");
    } 
    return res
        .status(200)
        .json(new ApiResponse(200, user, "Avatar updated successfully"));
});

const updatecoverimage = asyncHandler(async (req, res) => {
    // get user from req.user
    // get avatar from req.file
    // upload avatar to cloudinary
    // update user
    // return response
    const coverLocalPath = req.file?.path;

    if (!coverLocalPath) {
        throw new ApiError(400, "Cover image file is required");
    }

    const cover = await uploadOnCloudinary(coverLocalPath);

    if (!cover.url) {
        throw new ApiError(500, "Something went wrong while uploading cover image");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        { $set: { cover: cover.url } },
        { new: true }
    ).select("-password -refreshToken");
    if (!user) {
        throw new ApiError(404, "User not found");
    } 
    return res
        .status(200)
        .json(new ApiResponse(200, user, "Cover image updated successfully"));
});

export {registerUser, loginUser, logoutUser, refreshAccessToken, changecurrentpassword, getcurrentuser, updateaccountdetails, updateavatar, updatecoverimage};