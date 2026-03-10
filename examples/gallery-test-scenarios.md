# Test Scenarios untuk Fitur Galeri

## Test Cases Utama

### 1. Test Membuat Galeri Baru

#### Test Case 1.1: Membuat Galeri Valid
**Steps:**
1. Login ke aplikasi
2. Navigasi ke menu "Galeri Upload"
3. Klik "Buat Galeri Baru"
4. Isi form dengan data valid:
   - Judul: "Test Gallery Jakarta"
   - Daerah: "Jakarta"
   - Deskripsi: "Test description"
   - Galeri Publik: ✓
5. Klik "Buat Galeri"

**Expected Result:**
- Galeri berhasil dibuat
- Muncul notifikasi sukses
- Galeri muncul di daftar
- Modal tertutup otomatis

#### Test Case 1.2: Validasi Form Kosong
**Steps:**
1. Buka modal "Buat Galeri Baru"
2. Biarkan semua field kosong
3. Klik "Buat Galeri"

**Expected Result:**
- Muncul pesan error "Judul dan daerah harus diisi"
- Form tidak submit
- Modal tetap terbuka

#### Test Case 1.3: Validasi Field Wajib
**Steps:**
1. Isi hanya judul, kosongkan daerah
2. Klik "Buat Galeri"

**Expected Result:**
- Muncul pesan error
- Form tidak submit

### 2. Test Upload Gambar

#### Test Case 2.1: Upload Gambar Valid
**Steps:**
1. Pilih galeri yang sudah ada
2. Klik tombol "Upload"
3. Pilih 3 file gambar valid (JPG, PNG < 10MB)
4. Klik "Upload Gambar"

**Expected Result:**
- Progress bar muncul
- Semua gambar berhasil diupload
- Gambar muncul di galeri
- Notifikasi sukses muncul

#### Test Case 2.2: Upload File Terlalu Besar
**Steps:**
1. Pilih file gambar > 10MB
2. Coba upload

**Expected Result:**
- Muncul pesan error "File terlalu besar (max 10MB)"
- File tidak diupload

#### Test Case 2.3: Upload File Bukan Gambar
**Steps:**
1. Pilih file PDF atau TXT
2. Coba upload

**Expected Result:**
- Muncul pesan error "File bukan gambar"
- File tidak diupload

#### Test Case 2.4: Upload Multiple Files
**Steps:**
1. Pilih 10 file gambar sekaligus
2. Upload semua

**Expected Result:**
- Progress bar menunjukkan progress keseluruhan
- Semua file valid berhasil diupload
- File tidak valid dilewati dengan pesan error

### 3. Test Link Publik

#### Test Case 3.1: Generate Link Publik
**Steps:**
1. Buat galeri dengan status "Publik"
2. Klik tombol link (🔗)

**Expected Result:**
- Link disalin ke clipboard
- Notifikasi "Link publik berhasil disalin"
- Link memiliki format yang benar

#### Test Case 3.2: Akses Link Publik
**Steps:**
1. Copy link publik galeri
2. Buka browser baru (incognito)
3. Paste dan akses link

**Expected Result:**
- Halaman galeri publik terbuka
- Semua gambar tampil dengan benar
- Informasi galeri dan perusahaan tampil
- Tidak perlu login

#### Test Case 3.3: Galeri Private Tidak Bisa Diakses
**Steps:**
1. Buat galeri dengan status "Private"
2. Coba akses link publik

**Expected Result:**
- Halaman error "Galeri tidak ditemukan"
- Atau redirect ke halaman login

### 4. Test Lightbox Gallery

#### Test Case 4.1: Buka Lightbox
**Steps:**
1. Akses galeri publik
2. Klik salah satu gambar

**Expected Result:**
- Lightbox terbuka
- Gambar tampil full size
- Navigation arrows muncul (jika > 1 gambar)
- Close button muncul

#### Test Case 4.2: Navigasi Lightbox
**Steps:**
1. Buka lightbox
2. Klik arrow kanan/kiri
3. Gunakan keyboard arrow keys

**Expected Result:**
- Gambar berganti sesuai arah navigasi
- Counter "X dari Y" update
- Smooth transition

#### Test Case 4.3: Close Lightbox
**Steps:**
1. Buka lightbox
2. Tekan ESC atau klik close button

**Expected Result:**
- Lightbox tertutup
- Kembali ke view galeri normal

### 5. Test Responsive Design

#### Test Case 5.1: Mobile View
**Steps:**
1. Akses galeri di mobile browser
2. Test semua fungsi

**Expected Result:**
- Layout responsive
- Touch navigation bekerja
- Upload berfungsi di mobile
- Lightbox mobile-friendly

#### Test Case 5.2: Tablet View
**Steps:**
1. Test di tablet atau resize browser
2. Cek semua elemen

**Expected Result:**
- Grid layout menyesuaikan
- Touch dan mouse navigation bekerja

### 6. Test Performance

#### Test Case 6.1: Load Time Galeri Besar
**Steps:**
1. Buat galeri dengan 50+ gambar
2. Akses galeri publik
3. Measure load time

**Expected Result:**
- Halaman load < 3 detik
- Lazy loading bekerja
- Smooth scrolling

#### Test Case 6.2: Upload Batch Besar
**Steps:**
1. Upload 20 gambar sekaligus
2. Monitor progress dan memory usage

**Expected Result:**
- Upload berhasil tanpa crash
- Progress accurate
- Memory usage reasonable

### 7. Test Error Handling

#### Test Case 7.1: Network Error
**Steps:**
1. Disconnect internet
2. Coba upload gambar
3. Reconnect dan retry

**Expected Result:**
- Error message yang jelas
- Retry mechanism bekerja
- No data corruption

#### Test Case 7.2: Server Error
**Steps:**
1. Simulate server error (500)
2. Coba berbagai operasi

**Expected Result:**
- Graceful error handling
- User-friendly error messages
- App tidak crash

### 8. Test Security

#### Test Case 8.1: Unauthorized Access
**Steps:**
1. Logout dari aplikasi
2. Coba akses URL galeri management langsung

**Expected Result:**
- Redirect ke login page
- Tidak bisa akses fitur admin

#### Test Case 8.2: SQL Injection
**Steps:**
1. Coba input malicious SQL di form
2. Test berbagai injection patterns

**Expected Result:**
- Input disanitize dengan benar
- Tidak ada SQL injection vulnerability

### 9. Test Data Integrity

#### Test Case 9.1: Concurrent Upload
**Steps:**
1. Buka 2 browser tab
2. Upload gambar bersamaan ke galeri yang sama

**Expected Result:**
- Kedua upload berhasil
- Tidak ada data corruption
- Semua gambar tersimpan

#### Test Case 9.2: Delete Galeri
**Steps:**
1. Buat galeri dengan beberapa gambar
2. Delete galeri
3. Cek storage dan database

**Expected Result:**
- Galeri terhapus dari database
- Semua gambar terhapus dari storage
- Tidak ada orphaned files

## Automated Testing

### Unit Tests
```javascript
// Test service functions
describe('Gallery Service', () => {
  test('createGallery should create gallery with valid data', async () => {
    const galleryData = {
      title: 'Test Gallery',
      region: 'Jakarta',
      description: 'Test',
      isPublic: true
    };
    const result = await createGallery(galleryData);
    expect(result.id).toBeDefined();
    expect(result.title).toBe('Test Gallery');
  });
});
```

### Integration Tests
```javascript
// Test component integration
describe('GalleryUpload Component', () => {
  test('should create gallery and show in list', async () => {
    render(<GalleryUpload />);
    // Test implementation
  });
});
```

### E2E Tests
```javascript
// Test full user flow
describe('Gallery E2E', () => {
  test('complete gallery workflow', async () => {
    // Login -> Create Gallery -> Upload Images -> Share Link -> View Public
  });
});
```

## Performance Benchmarks

### Load Time Targets
- Gallery list page: < 2 seconds
- Public gallery page: < 3 seconds
- Image upload: < 5 seconds per image
- Lightbox open: < 500ms

### Memory Usage Targets
- Gallery with 50 images: < 100MB RAM
- Upload 10 images: < 200MB RAM peak
- Lightbox navigation: < 50MB additional

## Browser Compatibility

### Supported Browsers
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Mobile Browsers
- Chrome Mobile 90+
- Safari iOS 14+
- Samsung Internet 14+

## Accessibility Testing

### Screen Reader Support
- Test dengan NVDA/JAWS
- Proper ARIA labels
- Keyboard navigation

### Color Contrast
- Minimum 4.5:1 ratio
- Test dengan color blindness simulators

### Keyboard Navigation
- Tab order logical
- All functions accessible via keyboard
- Focus indicators visible

## Load Testing

### Concurrent Users
- 100 concurrent users viewing galleries
- 10 concurrent users uploading
- Database performance under load

### Storage Limits
- Test dengan 1000+ galleries
- Test dengan 10GB+ storage usage
- Cleanup performance

## Monitoring dan Alerting

### Metrics to Monitor
- Upload success rate
- Page load times
- Error rates
- Storage usage growth
- Public gallery views

### Alerts Setup
- Upload failure rate > 5%
- Page load time > 5 seconds
- Storage usage > 80%
- Error rate > 1%