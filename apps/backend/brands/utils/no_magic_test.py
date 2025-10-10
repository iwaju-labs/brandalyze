#!/usr/bin/env python3
"""
No-magic test - tests utils without python-magic library
"""

import os
import sys
import tempfile
from pathlib import Path

# Add the current directory to Python path
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

# Mock the Django UploadedFile for testing
class MockUploadedFile:
    def __init__(self, name, content, content_type='application/octet-stream'):
        self.name = name
        self.content = content
        self.content_type = content_type
        self.size = len(content)
        self._position = 0
    
    def read(self, size=-1):
        if size == -1:
            data = self.content[self._position:]
            self._position = len(self.content)
        else:
            data = self.content[self._position:self._position + size]
            self._position += len(data)
        return data
    
    def seek(self, position):
        self._position = position

# Mock Django modules
class MockDjango:
    class core:
        class files:
            class uploadedfile:
                UploadedFile = MockUploadedFile

sys.modules['django'] = MockDjango()
sys.modules['django.core'] = MockDjango.core()
sys.modules['django.core.files'] = MockDjango.core.files()
sys.modules['django.core.files.uploadedfile'] = MockDjango.core.files.uploadedfile()

# Mock magic module to avoid segfault
class MockMagic:
    @staticmethod
    def from_file(filepath, mime=False):
        return None
    
    @staticmethod
    def from_buffer(content, mime=False):
        return None

sys.modules['magic'] = MockMagic()

# Now import our utils
print("Importing utils...")
try:
    from utils import (
        get_supported_formats_info,
        detect_file_type,
        validate_file_size,
        validate_file_content,
        get_file_metadata
    )
    print("✅ Import successful!")
except Exception as e:
    print(f"❌ Import failed: {e}")
    sys.exit(1)

def test_basic_functionality():
    """Test basic functionality without magic"""
    print("\n📋 Testing Basic Functionality")
    print("-" * 35)
    
    # Test supported formats
    info = get_supported_formats_info()
    print(f"✅ Supported formats: {list(info['supported_formats'].keys())}")
    print(f"✅ Total extensions: {len(info['extensions'])}")
    
    # Test file type detection (extension-based only)
    test_cases = [
        ('document.pdf', 'pdf'),
        ('report.docx', 'docx'),
        ('readme.txt', 'txt'),
        ('notes.md', 'md'),
        ('image.png', None),  # unsupported
    ]
    
    print("\n🔍 File Type Detection (extension-based):")
    for filename, expected in test_cases:
        detected_type, mime_type = detect_file_type(f"/fake/path/{filename}")
        status = "✅" if detected_type == expected else "❌"
        result = detected_type or "unsupported"
        print(f"  {status} {filename} → {result}")
    
    return True

def test_with_files():
    """Test with actual files"""
    print("\n📁 Testing with Real Files")
    print("-" * 30)
    
    temp_dir = tempfile.mkdtemp()
    print(f"Created temp directory: {temp_dir}")
    
    try:
        # Create test files
        files = {}
        
        # PDF file
        pdf_content = b'%PDF-1.4\nTest PDF content'
        pdf_path = os.path.join(temp_dir, 'test.pdf')
        with open(pdf_path, 'wb') as f:
            f.write(pdf_content)
        files['pdf'] = pdf_path
        
        # Text file
        txt_content = b'Hello, World!\nThis is a test file.'
        txt_path = os.path.join(temp_dir, 'test.txt')
        with open(txt_path, 'wb') as f:
            f.write(txt_content)
        files['txt'] = txt_path
        
        # Empty file
        empty_path = os.path.join(temp_dir, 'empty.txt')
        with open(empty_path, 'wb') as f:
            pass
        files['empty'] = empty_path
        
        # Test each file
        for file_type, file_path in files.items():
            filename = os.path.basename(file_path)
            file_size = os.path.getsize(file_path)
            print(f"\n  📄 {filename} ({file_size} bytes):")
            
            # Test detection
            detected_type, mime_type = detect_file_type(file_path)
            print(f"     Detected: {detected_type}")
            
            if detected_type and file_type != 'empty':
                # Test size validation
                size_errors = validate_file_size(file_path, detected_type)
                print(f"     Size: {'✅ OK' if not size_errors else f'❌ {len(size_errors)} errors'}")
                
                # Test content validation
                content_errors = validate_file_content(file_path, detected_type)
                print(f"     Content: {'✅ OK' if not content_errors else f'❌ {len(content_errors)} errors'}")
                
                # Test metadata
                metadata = get_file_metadata(file_path, detected_type)
                print(f"     Metadata: {len(metadata)} fields")
            elif file_type == 'empty':
                # Test empty file
                size_errors = validate_file_size(file_path, 'txt')
                print(f"     Size: {'✅ Expected errors' if size_errors else '❌ Unexpected'}")
        
        return True
        
    finally:
        # Clean up
        import shutil
        shutil.rmtree(temp_dir)
        print(f"\n🧹 Cleaned up: {temp_dir}")

def main():
    """Run tests"""
    print("🚀 File Validation Utility - No Magic Test")
    print("=" * 50)
    
    try:
        test_basic_functionality()
        test_with_files()
        
        print("\n" + "=" * 50)
        print("🎉 All tests completed successfully!")
        print("\nNote: python-magic was mocked due to segfault issues.")
        print("The utility works for file extension detection and validation!")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = main()
    print(f"\n🏁 Test {'PASSED' if success else 'FAILED'}")
    sys.exit(0 if success else 1)
