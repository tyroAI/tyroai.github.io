/**
 * DOSYA MODELİ — OneDrive / SharePoint satırının TEK biçimi (2026-09-30).
 *
 * Header'daki dosya paneli, sağ kenar çentiği, sohbetin "/" seçicisi ve
 * Keşfet › Dosyalarım aynı satırı çiziyor; normalleştirme bu yüzden tek
 * yerde. `FileBadge`, `FilePreviewDialog`, `FileMailDialog` ve TYRO'ya devir
 * bu alanları okuyor: `{ id, kind, name, ext, size, childCount, modified,
 * modifiedBy, webUrl, driveId, driveType, itemId }` — geri kalanı (aşağıda)
 * Dosyalarım'ın süzgeçleri için eklendi ve eski tüketicileri etkilemiyor:
 * `created, createdBy, createdById, createdByEmail, modifiedById,
 * modifiedByEmail, parentId, parentPath, siteId, remote`. Kimlik alanları
 * (`…ById` Entra oid, `…ByEmail` adres) boş gelebilir — arama isabetinde
 * `user.id` çoğu zaman yok; `isMine` bu yüzden kimliği, adresi ve adı
 * sırayla deniyor (`lib/filesQuery.js`).
 *
 * ⚠️ **ÖNCE `remoteItem`.** Başka bir sürücüde yaşayan öğenin (paylaşılan
 * kitaplıktan son kullanılan, arama isabeti, OneDrive kısayolu) GERÇEK adresi
 * `remoteItem.id` + `remoteItem.parentReference.driveId`. Eski normalleştirici
 * yalnız üst alanları okuyordu: böyle bir satırda `driveId` boş kalıyor,
 * küçük resim atlanıyor, önizleme penceresi sonsuza dek dönüyor ve posta
 * `/me/drive/items/{id}/content`e düşüp 404 alıyordu. `id` yine YEREL kimlik
 * (liste anahtarı); adresi `driveId` + `itemId` taşır.
 */

/** Uzantı: rozet ve "TYRO ile çalış" bağlamı için. Adın son noktasından sonrası. */
export function extOf(name) {
  const i = (name ?? "").lastIndexOf(".")
  return i > 0 ? name.slice(i + 1).toLowerCase() : ""
}

export function normaliseDriveItem(r) {
  const t = r.remoteItem ?? null
  const folder = r.folder ?? t?.folder ?? null
  const isFolder = Boolean(folder)
  const name = r.name ?? t?.name ?? ""
  const parent = t?.parentReference ?? r.parentReference ?? null
  const by = r.lastModifiedBy ?? t?.lastModifiedBy ?? null
  // Oluşturan: "Kişi = Sen" süzgeci oluşturduğun dosyayı da kapsıyor (`isMine`).
  // Sunucu kısıtı `AuthorOWSUSER`ı da soruyor; istemci yalnız son değiştireni
  // sınasaydı sunucunun doğru döndürdüğü dosyayı ekrandan atardı.
  const cby = r.createdBy ?? t?.createdBy ?? null
  return {
    id: r.id,
    kind: isFolder ? "folder" : "file",
    name,
    ext: isFolder ? "" : extOf(name),
    size: r.size ?? t?.size ?? null,
    childCount: isFolder ? (folder.childCount ?? null) : null,
    modified: r.lastModifiedDateTime ?? t?.lastModifiedDateTime ?? null,
    modifiedBy: by?.user?.displayName ?? "",
    // Hedefin kendi adresi önce: kısayolun üst adresi kullanıcının OneDrive'ındaki
    // bağlantı, hedef ise dosyanın gerçekten durduğu yer.
    webUrl: t?.webUrl ?? r.webUrl ?? "",
    driveId: parent?.driveId ?? null,
    // Dosyanın NEREDE yaşadığı: "personal"/"business" kişinin OneDrive'ı,
    // "documentLibrary" bir SharePoint kitaplığı.
    driveType: parent?.driveType ?? "",
    itemId: t?.id ?? r.id,
    // ── Dosyalarım'ın süzgeç ve konum alanları ──
    created: r.createdDateTime ?? t?.createdDateTime ?? null,
    createdBy: cby?.user?.displayName ?? "",
    createdById: cby?.user?.id ?? "",
    createdByEmail: cby?.user?.email ?? "",
    modifiedById: by?.user?.id ?? "",
    modifiedByEmail: by?.user?.email ?? "",
    parentId: parent?.id ?? null,
    // `/drive/root:/Finans/2026` biçiminde; yalnız çocuk listelerinde gelir,
    // arama isabetlerinde gelmez.
    parentPath: parent?.path ?? "",
    siteId: parent?.siteId ?? null,
    remote: Boolean(t),
  }
}

export function normaliseSite(r) {
  return {
    id: r.id,
    kind: "site",
    name: r.displayName || r.name || r.webUrl || "",
    subtitle: r.webUrl ?? "",
    webUrl: r.webUrl ?? "",
    siteId: r.id,
  }
}

export function normaliseDrive(r) {
  return {
    id: r.id,
    kind: "drive",
    name: r.name ?? "",
    subtitle: r.description ?? "",
    webUrl: r.webUrl ?? "",
    driveId: r.id,
    driveType: r.driveType ?? "",
  }
}

/**
 * Ekip (Microsoft 365 grubu, `/me/memberOf`) → satır. Sürücüsü BİLİNMİYOR:
 * `/groups/{id}/drive` tıklamada çözülür (`resolveGroupDrive`), yani satırın
 * adresi (`webUrl`) ve belirteci o ana kadar boş. Ad kaynağın yazımıyla.
 */
export function normaliseGroup(r) {
  return {
    id: `group:${r.id}`,
    kind: "group",
    name: r.displayName ?? "",
    subtitle: r.description ?? "",
    webUrl: "",
    groupId: r.id,
  }
}
