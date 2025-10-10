"""
Test script for file validation utilities
"""

import os
import tempfile
from io import BytesIO
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase

# Import our utils
from .utils import (
    detect_file_type,
    validate_file_size,
    validate_file_content,
    validate_uploaded_file,
    get_file_metadata,
    get_supported_formats_info,
    FileValidationResult
)


def create_test_files():
    """Create sample test files for validation"""
    test_files = {}
    
    # Create a temporary directory
    temp_dir = tempfile.mkdtemp()
    
    # Create PDF test file
    pdf_content = b'%PDF-1.4\n1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n2 0 obj\n<</Type/Pages/Kids[3 0 R]/Count 1>>\nendobj\n3 0 obj\n<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000015 00000 n \n0000000074 00000 n \n0000000120 00000 n \ntrailer\n<</Size 4/Root 1 0 R>>\nstartxref\n179\n%%EOF'
    pdf_path = os.path.join(temp_dir, 'test.pdf')
    with open(pdf_path, 'wb') as f:
        f.write(pdf_content)
    test_files['pdf'] = pdf_path
    
    # Create DOCX test file (basic ZIP structure)
    docx_content = b'PK\x03\x04\x14\x00\x00\x00\x08\x00'
    docx_path = os.path.join(temp_dir, 'test.docx')
    with open(docx_path, 'wb') as f:
        f.write(docx_content)
    test_files['docx'] = docx_path
    
    # Create TXT test file
    txt_content = b'This is a test text file.\nLine 2 of the file.\nThird line here.'
    txt_path = os.path.join(temp_dir, 'test.txt')
    with open(txt_path, 'wb') as f:
        f.write(txt_content)
    test_files['txt'] = txt_path
    
    # Create Markdown test file
    md_content = b'# Test Markdown\n\nThis is a **test** markdown file.\n\n- Item 1\n- Item 2\n- Item 3'
    md_path = os.path.join(temp_dir, 'test.md')
    with open(md_path, 'wb') as f:
        f.write(md_content)
    test_files['md'] = md_path
    
    # Create invalid file
    invalid_content = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR'  # PNG header
    invalid_path = os.path.join(temp_dir, 'test.png')
    with open(invalid_path, 'wb') as f:
        f.write(invalid_content)
    test_files['invalid'] = invalid_path
    
    # Create empty file
    empty_path = os.path.join(temp_dir, 'empty.txt')
    with open(empty_path, 'wb') as f:
        pass  # Create empty file
    test_files['empty'] = empty_path
    
    print(f"Test files created in: {temp_dir}")
    return test_files, temp_dir


def test_file_type_detection(test_files):
    """Test file type detection functionality"""
    print("\n=== Testing File Type Detection ===")
    
    # Test valid files
    for file_type, file_path in test_files.items():
        if file_type in ['pdf', 'docx', 'txt', 'md']:
            detected_type, mime_type = detect_file_type(file_path)
            print(f"{file_type.upper()} file: {detected_type} ({mime_type})")
            assert detected_type == file_type, f"Expected {file_type}, got {detected_type}"
    
    # Test invalid file
    detected_type, mime_type = detect_file_type(test_files['invalid'])
    print(f"PNG file (invalid): {detected_type} ({mime_type})")
    assert detected_type is None, f"Expected None for PNG file, got {detected_type}"
    
    print("✅ File type detection tests passed!")


def test_file_size_validation(test_files):
    """Test file size validation"""
    print("\n=== Testing File Size Validation ===")
    
    for file_type, file_path in test_files.items():
        if file_type in ['pdf', 'docx', 'txt', 'md']:
            errors = validate_file_size(file_path, file_type)
            file_size = os.path.getsize(file_path)
            print(f"{file_type.upper()} file ({file_size} bytes): {len(errors)} errors")
            if errors:
                for error in errors:
                    print(f"  - {error}")
    
    # Test empty file
    errors = validate_file_size(test_files['empty'], 'txt')
    print(f"Empty file: {len(errors)} errors")
    assert len(errors) > 0, "Empty file should have validation errors"
    
    print("✅ File size validation tests passed!")


def test_file_content_validation(test_files):
    """Test file content validation"""
    print("\n=== Testing File Content Validation ===")
    
    for file_type, file_path in test_files.items():
        if file_type in ['pdf', 'docx', 'txt', 'md']:
            errors = validate_file_content(file_path, file_type)
            print(f"{file_type.upper()} file: {len(errors)} content errors")
            if errors:
                for error in errors:
                    print(f"  - {error}")
    
    print("✅ File content validation tests passed!")


def test_uploaded_file_validation(test_files):
    """Test validation with Django UploadedFile objects"""
    print("\n=== Testing Uploaded File Validation ===")
    
    for file_type, file_path in test_files.items():
        if file_type in ['pdf', 'docx', 'txt', 'md']:
            # Read file content
            with open(file_path, 'rb') as f:
                content = f.read()
            
            # Create Django UploadedFile
            filename = f"test.{file_type}"
            uploaded_file = SimpleUploadedFile(
                name=filename,
                content=content,
                content_type=f"application/{file_type}"
            )
            
            # Validate
            result = validate_uploaded_file(uploaded_file)
            print(f"{file_type.upper()} upload - Valid: {result.is_valid}, Type: {result.file_type}")
            if result.errors:
                for error in result.errors:
                    print(f"  - {error}")
            
            print(f"  Metadata: {result.metadata.get('file_name')} ({result.metadata.get('file_size')} bytes)")
    
    print("✅ Uploaded file validation tests passed!")


def test_metadata_extraction(test_files):
    """Test metadata extraction"""
    print("\n=== Testing Metadata Extraction ===")
    
    for file_type, file_path in test_files.items():
        if file_type in ['pdf', 'docx', 'txt', 'md']:
            metadata = get_file_metadata(file_path, file_type)
            print(f"{file_type.upper()} metadata:")
            for key, value in metadata.items():
                print(f"  {key}: {value}")
            print()
    
    print("✅ Metadata extraction tests passed!")


def test_supported_formats_info():
    """Test supported formats information"""
    print("\n=== Testing Supported Formats Info ===")
    
    info = get_supported_formats_info()
    print(f"Total formats: {info['total_formats']}")
    print(f"Extensions: {info['extensions']}")
    print("Supported formats:")
    for format_name, config in info['supported_formats'].items():
        print(f"  {format_name}: {config['description']} (max: {config['max_size']} bytes)")
    
    print("✅ Supported formats info test passed!")


def cleanup_test_files(temp_dir):
    """Clean up test files"""
    import shutil
    try:
        shutil.rmtree(temp_dir)
        print(f"\n🧹 Cleaned up test files from: {temp_dir}")
    except Exception as e:
        print(f"\n⚠️  Warning: Could not clean up {temp_dir}: {e}")


def main():
    """Run all tests"""
    print("🧪 Starting File Validation Utility Tests")
    print("=" * 50)
    
    try:
        # Create test files
        test_files, temp_dir = create_test_files()
        
        # Run tests
        test_file_type_detection(test_files)
        test_file_size_validation(test_files)
        test_file_content_validation(test_files)
        test_uploaded_file_validation(test_files)
        test_metadata_extraction(test_files)
        test_supported_formats_info()
        
        print("\n" + "=" * 50)
        print("🎉 All tests passed successfully!")
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        
    finally:
        # Clean up
        if 'temp_dir' in locals():
            cleanup_test_files(temp_dir)


if __name__ == "__main__":
    main()
