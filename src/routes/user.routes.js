import { Router } from "express";
import { changecurrentpassword, getcurrentuser, getuserchannelprofile, getWatchHistory, loginUser, logoutUser, refreshAccessToken, registerUser, updateaccountdetails, updateavatar, updatecoverimage } from "../controllers/user.controller.js";
import { upload } from "../middleware/multer.middleware.js";
import  {verifyJWT}  from "../middleware/auth.middleware.js";
const router = Router();

router.route("/register").post(upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 }
]), registerUser);

router.route("/login").post(loginUser);

router.route("/logout").post(verifyJWT,logoutUser);
router.route("/refresh-token").post(refreshAccessToken); 

router.route("/change-password").post(verifyJWT, changecurrentpassword)
router.route("/current-user").get(verifyJWT, getcurrentuser)
router.route("/update-account").patch(verifyJWT, updateaccountdetails)

router.route("/avatar").patch(verifyJWT, upload.single("avatar"), updateavatar )
router.route("/cover-image").patch(verifyJWT, upload.single("coverImage"), updatecoverimage)

router.route("/c/:username").get(verifyJWT, getuserchannelprofile)
router.route("/history").get(verifyJWT, getWatchHistory)


export default router;