import { clearMyDriveCache, useMyDrive } from "@/hooks/useMyDrive"

/**
 * Kullanıcının KENDİ OneDrive sürücüsünün kimliği.
 *
 * Sohbetteki referans seçicisi dosyaları OneDrive / SharePoint diye ayırıyor
 * ve bunun tek KESİN sinyali bu: satırın `parentReference.driveId` değeri bu
 * kimlikle eşleşiyorsa dosya kullanıcınındır, eşleşmiyorsa başka bir
 * sürücüde — yani bir SharePoint kitaplığında — yaşıyor.
 *
 * Neden alan yetmedi: `/me/drive/recent` satırlarında `parentReference`
 * çoğu zaman `driveType` taşımıyor ve adres deseni (`-my.` / `/sites/`)
 * bulutlara ve özel alan adlarına göre değişiyor. İkisi de yedek olarak
 * duruyor (bkz. `lib/fileActions.js`), ama karar önce buradan veriliyor.
 *
 * `useMyDrive`in ince sarmalayıcısı (2026-09-30): önbellek artık hesap
 * anahtarlı ve çıkışta siliniyor — eski tek global değer silinmiyordu.
 */
export function clearMyDriveIdCache() {
  clearMyDriveCache()
}

export function useMyDriveId() {
  return useMyDrive().id
}
