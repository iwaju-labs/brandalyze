from setuptools import setup

setup(
    name="ai_core",
    version="0.1.0",
    description="AI core functionality for Brandalyze",
    packages=["ai_core"],
    package_dir={"ai_core": "."},
    install_requires=[
        "openai",
        "qdrant-client", 
        "numpy",
        "scikit-learn",
    ],
    python_requires=">=3.8",
)
