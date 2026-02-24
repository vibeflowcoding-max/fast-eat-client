"use client";

import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Star, CheckCircle2 } from 'lucide-react';
import { useLoyaltyStore } from '../../gamification/store/useLoyaltyStore';

interface PhotoReviewModalProps {
    restaurantName: string;
    onClose: () => void;
}

export default function PhotoReviewModal({ restaurantName, onClose }: PhotoReviewModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [rating, setRating] = useState<number>(0);
    const [isUploading, setIsUploading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const { addPoints, incrementStreak } = useLoyaltyStore();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            setPreviewUrl(URL.createObjectURL(selectedFile));
        }
    };

    const handleSubmit = async () => {
        if (!file || rating === 0) return;

        setIsUploading(true);

        // Simulate upload and moderation delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        setIsUploading(false);
        setIsSuccess(true);

        // Award points and streak for the photo review
        addPoints(150, 'Review con foto');
        incrementStreak();

        setTimeout(() => {
            onClose();
        }, 3000); // Close after showing success
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4 backdrop-blur-md">
            <div className="bg-white w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors z-10"
                >
                    <X className="w-4 h-4" />
                </button>

                {!isSuccess ? (
                    <div className="p-6 md:p-8 flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
                            <Camera className="w-8 h-8" />
                        </div>

                        <h2 className="text-xl font-black text-gray-900 leading-tight mb-2">
                            ¿Qué tal estuvo tu comida en {restaurantName}?
                        </h2>
                        <p className="text-sm text-gray-500 font-medium mb-6">
                            Sube una foto y gana <strong className="text-orange-500">+150 pts</strong> de lealtad.
                        </p>

                        {/* Rating Stars */}
                        <div className="flex gap-2 mb-6">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    onClick={() => setRating(star)}
                                    className={`w-10 h-10 flex items-center justify-center transition-transform hover:scale-110 ${rating >= star ? 'text-yellow-400' : 'text-gray-200'}`}
                                >
                                    <Star className="w-8 h-8 fill-current" />
                                </button>
                            ))}
                        </div>

                        {/* Photo Upload Area */}
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className={`w-full h-48 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors relative overflow-hidden ${previewUrl ? 'border-transparent' : 'border-gray-300 hover:border-red-400 hover:bg-red-50'}`}
                        >
                            {previewUrl ? (
                                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <>
                                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                    <span className="text-sm font-bold text-gray-600">Toca para subir foto</span>
                                </>
                            )}
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept="image/*"
                                className="hidden"
                            />
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={!file || rating === 0 || isUploading}
                            className={`w-full mt-6 py-4 rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-xl active:scale-95 ${(!file || rating === 0 || isUploading) ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-black text-white hover:bg-red-600'}`}
                        >
                            {isUploading ? 'Subiendo...' : 'Publicar y Ganar 🎉'}
                        </button>
                    </div>
                ) : (
                    <div className="p-8 flex flex-col items-center text-center">
                        <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-6 animate-bounce">
                            <CheckCircle2 className="w-10 h-10" />
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 mb-2">¡Puntos ganados!</h2>
                        <p className="text-gray-500 mb-6 font-medium">
                            Gracias por compartir tu experiencia en {restaurantName}. Se han añadido <strong className="text-orange-500">+150 pts</strong> a tu cuenta.
                        </p>
                        <div className="bg-orange-50 text-orange-700 px-4 py-2 rounded-full font-bold text-sm">
                            Racha actualizda 🔥
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
