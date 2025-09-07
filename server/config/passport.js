import passport from 'passport';
import GoogleStrategy from 'passport-google-oauth20';
import User from '../models/users-model.js';
import dotenv from 'dotenv';

dotenv.config();

passport.use(new GoogleStrategy({
    clientID: process.env.clientID,
    clientSecret: process.env.clientSecret,
    callbackURL: '/auth/google/callback'
},
    async (accessToken, refreshToken, profile, done) => {
        const pictureBaseUrl = profile.photos[0].value.split('=')[0];
        const existingUser = await User.findOne({ googleId: profile.id });

        if (existingUser) {
            // If user exists, check if their picture URL is the old, full one or different.
            // If so, update it to the new base URL.
            if (existingUser.picture !== pictureBaseUrl) {
                existingUser.picture = pictureBaseUrl;
                await existingUser.save();
            }
            return done(null, existingUser);
        }

        const newUser = await User.create({
            googleId: profile.id,
            name: profile.displayName,
            email: profile.emails[0].value,
            picture: pictureBaseUrl
        });

        done(null, newUser);
    }
));