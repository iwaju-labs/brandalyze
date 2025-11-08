import os
import mimetypes
from typing import Dict, List, Tuple, Optional, Union
from django.core.files.uploadedfile import UploadedFile

MIME_TYPE_PDF = 'application/pdf'
MIME_TYPE_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
MIME_TYPE_TEXT_PLAIN = 'text/plain'
MIME_TYPE_TEXT_MARKDOWN = 'text/markdown'
MIME_TYPE_TEXT_X_MARKDOWN = 'text/x-markdown'

SUPPORTED_FORMATS = {
    'pdf': {
        'extensions': ['.pdf'],
        'mime_types': [MIME_TYPE_PDF],
        'max_size': 50 * 1024 * 1024,  # 50MB
        'description': 'PDF documents'
    },
    'docx': {
        'extensions': ['.docx'],
        'mime_types': [MIME_TYPE_DOCX],
        'max_size': 25 * 1024 * 1024,  # 25MB
        'description': 'Microsoft Word documents'
    },
    'txt': {
        'extensions': ['.txt'],
        'mime_types': [MIME_TYPE_TEXT_PLAIN],
        'max_size': 10 * 1024 * 1024,  # 10MB
        'description': 'Plain text files'
    },
    'md': {
        'extensions': ['.md', '.markdown'],
        'mime_types': [MIME_TYPE_TEXT_MARKDOWN, MIME_TYPE_TEXT_X_MARKDOWN, MIME_TYPE_TEXT_PLAIN],
        'max_size': 10 * 1024 * 1024,  # 10MB
        'description': 'Markdown files'
    },
    'image': {
        'extensions': ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'],
        'mime_types': ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'],
        'max_size': 10 * 1024 * 1024,  # 10MB
        'description': 'Image files (OCR text extraction)'
    }
}


class FileValidationResult:
    """Structured result for file validation"""
    
    def __init__(self, is_valid: bool, file_type: Optional[str] = None, 
                 errors: Optional[List[str]] = None, metadata: Optional[Dict] = None):
        self.is_valid = is_valid
        self.file_type = file_type
        self.errors = errors or []
        self.metadata = metadata or {}
    
    def to_dict(self) -> Dict:
        return {
            'is_valid': self.is_valid,
            'file_type': self.file_type,
            'errors': self.errors,
            'metadata': self.metadata
        }


def _get_mime_type_from_file(file_path: str) -> Optional[str]:
    """Get MIME type from file path using mimetypes module"""
    mime_type, _ = mimetypes.guess_type(file_path)
    return mime_type


def _get_mime_type_from_upload(file: UploadedFile) -> Optional[str]:
    """Get MIME type from uploaded file using content_type"""
    return file.content_type


def _check_format_match(ext: str, mime_type: Optional[str], format_type: str) -> bool:
    """Check if extension and MIME type match a specific format"""
    config = SUPPORTED_FORMATS[format_type]
    
    ext_match = ext in config['extensions']
    mime_match = mime_type in config['mime_types'] if mime_type else False
    
    # Special case for markdown files
    if format_type == 'md' and ext in ['.md', '.markdown'] and mime_type == MIME_TYPE_TEXT_PLAIN:
        mime_match = True
    
    return ext_match or mime_match


def detect_file_type(file: Union[UploadedFile, str]) -> Tuple[Optional[str], Optional[str]]:
    """
    Detect file type by extension and MIME type
    
    Args:
        file: Django UploadedFile object or file path string
        
    Returns:
        Tuple of (detected_type, mime_type) or (None, None) if not supported
    """
    try:
        if isinstance(file, str):
            file_name = os.path.basename(file)
            mime_type = _get_mime_type_from_file(file)
        elif isinstance(file, UploadedFile):
            file_name = file.name
            mime_type = _get_mime_type_from_upload(file)
        else:
            return None, None
            
        if not file_name:
            return None, None
            
        # Get file extension
        _, ext = os.path.splitext(file_name.lower())
        
        # Check against supported formats
        for format_type in SUPPORTED_FORMATS:
            if _check_format_match(ext, mime_type, format_type):
                return format_type, mime_type
                
        return None, mime_type
        
    except Exception:
        return None, None


def validate_file_size(file: Union[UploadedFile, str], file_type: str) -> List[str]:
    """
    Validate file size against format-specific limits
    
    Args:
        file: Django UploadedFile object or file path string
        file_type: Detected file type
        
    Returns:
        List of validation errors (empty if valid)
    """
    errors = []
    
    try:
        # Get file size
        if isinstance(file, str):
            if not os.path.exists(file):
                errors.append("File does not exist")
                return errors
            file_size = os.path.getsize(file)
        elif isinstance(file, UploadedFile):
            file_size = file.size
        else:
            errors.append("Invalid file object")
            return errors
            
        # Check against format-specific size limit
        if file_type in SUPPORTED_FORMATS:
            max_size = SUPPORTED_FORMATS[file_type]['max_size']
            if file_size > max_size:
                errors.append(f"File size ({file_size} bytes) exceeds maximum allowed size ({max_size} bytes) for {file_type} files")
                
        # Check for empty files
        if file_size == 0:
            errors.append("File is empty")
            
    except Exception as e:
        errors.append(f"Error validating file size: {str(e)}")
        
    return errors


def _validate_pdf_content(content: bytes) -> List[str]:
    """Validate PDF file content"""
    errors = []
    if not content.startswith(b'%PDF-'):
        errors.append("File does not appear to be a valid PDF")
    return errors


def _validate_docx_content(content: bytes) -> List[str]:
    """Validate DOCX file content"""
    errors = []
    if not content.startswith(b'PK'):
        errors.append("File does not appear to be a valid DOCX document")
    return errors


def _validate_text_content(content: bytes) -> List[str]:
    """Validate text file content"""
    errors = []
    try:
        content.decode('utf-8')
    except UnicodeDecodeError:
        try:
            content.decode('latin-1')
        except UnicodeDecodeError:
            errors.append("File does not appear to contain valid text content")
    return errors


def validate_file_content(file: Union[UploadedFile, str], file_type: str) -> List[str]:
    """
    Perform basic content validation for different file types
    
    Args:
        file: Django UploadedFile object or file path string
        file_type: Detected file type
        
    Returns:
        List of validation errors (empty if valid)
    """
    errors = []
    
    try:
        # Read file content for validation
        if isinstance(file, str):
            if not os.path.exists(file):
                errors.append("File does not exist")
                return errors
            with open(file, 'rb') as f:
                content = f.read(1024)  # Read first 1KB for validation
        elif isinstance(file, UploadedFile):
            file.seek(0)
            content = file.read(1024)  # Read first 1KB for validation
            file.seek(0)  # Reset file pointer
        else:
            errors.append("Invalid file object")
            return errors
        
        # Perform file-type specific validations
        validation_map = {
            'pdf': _validate_pdf_content,
            'docx': _validate_docx_content,
            'txt': _validate_text_content,
            'md': _validate_text_content,
        }
        
        validator = validation_map.get(file_type)
        if validator:
            errors.extend(validator(content))
                    
    except Exception as e:
        errors.append(f"Error validating file content: {str(e)}")
        
    return errors


def get_file_metadata(file: Union[UploadedFile, str], file_type: str) -> Dict:
    """
    Extract metadata from the file
    
    Args:
        file: Django UploadedFile object or file path string
        file_type: Detected file type
        
    Returns:
        Dictionary containing file metadata
    """
    metadata = {}
    
    try:
        # Basic metadata
        if isinstance(file, str):
            if os.path.exists(file):
                stat = os.stat(file)
                metadata.update({
                    'file_name': os.path.basename(file),
                    'file_size': stat.st_size,
                    'created_time': stat.st_ctime,
                    'modified_time': stat.st_mtime,
                })
        elif isinstance(file, UploadedFile):
            metadata.update({
                'file_name': file.name,
                'file_size': file.size,
                'content_type': file.content_type,
            })
            
        # Add format-specific metadata
        metadata.update({
            'detected_type': file_type,
            'format_description': SUPPORTED_FORMATS.get(file_type, {}).get('description', 'Unknown'),
            'max_allowed_size': SUPPORTED_FORMATS.get(file_type, {}).get('max_size', 0),
        })
        
    except Exception as e:
        metadata['error'] = f"Error extracting metadata: {str(e)}"
        
    return metadata


def validate_uploaded_file(file: UploadedFile) -> FileValidationResult:
    """
    Comprehensive validation for uploaded files
    
    Args:
        file: Django UploadedFile object
        
    Returns:
        FileValidationResult object with validation results
    """
    errors = []
    
    # Detect file type
    file_type, mime_type = detect_file_type(file)
    
    if not file_type:
        errors.append(f"Unsupported file type. Supported formats: {', '.join(SUPPORTED_FORMATS.keys())}")
        return FileValidationResult(
            is_valid=False,
            file_type=None,
            errors=errors,
            metadata={'mime_type': mime_type, 'file_name': file.name}
        )
    
    # Validate file size
    size_errors = validate_file_size(file, file_type)
    errors.extend(size_errors)
    
    # Validate file content
    content_errors = validate_file_content(file, file_type)
    errors.extend(content_errors)
    
    # Get metadata
    metadata = get_file_metadata(file, file_type)
    metadata['mime_type'] = mime_type
    
    return FileValidationResult(
        is_valid=len(errors) == 0,
        file_type=file_type,
        errors=errors,
        metadata=metadata
    )


def get_supported_formats_info() -> Dict:
    """
    Get information about supported file formats
    
    Returns:
        Dictionary with supported formats information
    """
    return {
        'supported_formats': SUPPORTED_FORMATS,
        'total_formats': len(SUPPORTED_FORMATS),
        'extensions': [ext for config in SUPPORTED_FORMATS.values() for ext in config['extensions']]
    }
