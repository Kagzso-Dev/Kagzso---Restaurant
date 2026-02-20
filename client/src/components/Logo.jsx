import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const Logo = ({ size = 'md', showText = true }) => {
    const { settings } = useContext(AuthContext);
    const sizeClasses = {
        sm: 'w-8 h-8 text-sm',
        md: 'w-12 h-12 text-xl',
        lg: 'w-16 h-16 text-3xl',
        xl: 'w-24 h-24 text-5xl'
    };

    return (
        <div className="flex flex-col items-center justify-center">
            <div className={`${sizeClasses[size]} bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg`}>
                {settings.restaurantName.substring(0, 2).toUpperCase()}
            </div>
            {showText && (
                <div className="text-center mt-3">
                    <h1 className="text-2xl font-bold text-white tracking-wide">{settings.restaurantName}</h1>
                    <p className="text-sm text-gray-500 font-medium">Restaurant POS System</p>
                </div>
            )}
        </div>
    );
};

export default Logo;

