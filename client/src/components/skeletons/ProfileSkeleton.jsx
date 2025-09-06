import React from 'react';

const ProfileSkeleton = () => {
    return (
        <div className="h-full flex items-center justify-center p-4 bg-base-200">
            <div className="card rounded-2xl w-full max-w-md bg-base-100 shadow-xl animate-pulse">
                <figure className="px-10 pt-10">
                    {/* Image Placeholder */}
                    <div className="w-32 h-32 rounded-full bg-base-300"></div>
                </figure>
                <div className="card-body items-center text-center">
                    {/* Name Placeholder */}
                    <div className="h-8 w-48 rounded-md bg-base-300 mb-2"></div>
                    {/* Email Placeholder */}
                    <div className="h-5 w-64 rounded-md bg-base-300/70"></div>
                    
                    {/* Member Since Placeholder */}
                    <div className="flex items-center gap-2 mt-4">
                        <div className="h-5 w-40 rounded-md bg-base-300/60"></div>
                    </div>

                    <div className="divider my-4"></div>

                    {/* Buttons Placeholder */}
                    <div className="card-actions w-full flex flex-col gap-3">
                        <div className="h-12 w-full rounded-lg bg-base-300"></div>
                        <div className="h-12 w-full rounded-lg bg-base-300"></div>
                        <div className="h-12 w-full rounded-lg bg-base-300 mt-2"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileSkeleton;