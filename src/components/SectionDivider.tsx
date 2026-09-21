/**
 * Bölümler arası ayırıcı.
 *
 * Bölümler arasında hiçbir görsel sınır yoktu; sayfa siyah boşlukta
 * yüzen kartlar gibi duruyordu. İnce bir altın iz, sayfayı tek bir
 * belge hissine bağlıyor ve boşluğu bilinçli gösteriyor.
 *
 * Sunucu bileşeni: etkileşimi yok, gereksiz yere istemciye gitmesin.
 */
export default function SectionDivider() {
  return (
    <div className="px-6" aria-hidden="true">
      <div className="sec-divider" />
    </div>
  );
}
