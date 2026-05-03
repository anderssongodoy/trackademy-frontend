import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ImageCompressionService {
  
  async compressAndConvertToBase64(file: File, maxWidth: number = 1200, maxHeight: number = 1200): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e: any) => {
        const img = new Image();
        
        img.onload = () => {
          // Calcular dimensiones
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }
          
          // Crear canvas y comprimir
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convertir a base64 con compresión JPEG (0.8 = 80% calidad)
          const base64 = canvas.toDataURL('image/jpeg', 0.8);
          resolve(base64);
        };
        
        img.onerror = () => reject(new Error('Could not load image'));
        img.src = e.target.result;
      };
      
      reader.onerror = () => reject(new Error('Could not read file'));
      reader.readAsDataURL(file);
    });
  }
}
