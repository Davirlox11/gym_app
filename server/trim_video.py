#!/usr/bin/env python3
import sys
import subprocess
import os
import shlex

def trim_video(input_path, output_path, t_in, t_out):
    """
    Trim video using ffmpeg
    """
    try:
        # Validate and sanitize input paths
        if not os.path.exists(input_path):
            raise ValueError(f"Input file does not exist: {input_path}")
        
        if not input_path or not output_path:
            raise ValueError("Input and output paths cannot be empty")
        
        # Ensure output directory exists
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # Build ffmpeg command with properly escaped arguments
        cmd = [
            'ffmpeg',
            '-y',  # Overwrite output files
            '-ss', str(float(t_in)),  # Start time (validate as float)
            '-to', str(float(t_out)),  # End time (validate as float)
            '-i', input_path,  # Input file
            '-c', 'copy',  # Copy streams without re-encoding
            output_path  # Output file
        ]
        
        # Execute ffmpeg command
        result = subprocess.run(cmd, 
                              capture_output=True, 
                              text=True, 
                              check=True)
        
        print(f"Video trimmed successfully: {output_path}")
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"FFmpeg error: {e.stderr}", file=sys.stderr)
        return False
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        return False

if __name__ == "__main__":
    if len(sys.argv) != 5:
        print("Usage: python trim_video.py <input> <output> <start_time> <end_time>", file=sys.stderr)
        sys.exit(1)
    
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    t_in = float(sys.argv[3])
    t_out = float(sys.argv[4])
    
    if trim_video(input_path, output_path, t_in, t_out):
        sys.exit(0)
    else:
        sys.exit(1)